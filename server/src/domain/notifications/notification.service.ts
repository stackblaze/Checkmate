import type { Monitor } from "@/domain/monitors/monitor.type.js";
import type { Notification } from "@/domain/notifications/notification.type.js";
import type { Incident } from "@/domain/incidents/incident.type.js";
import type { MonitorStatusResponse } from "@/types/network.js";
import type { NotificationMessage } from "@/domain/notifications/notification.type.js";
import { IMonitorsRepository } from "@/domain/monitors/monitor.repository.interface.js";
import { INotificationsRepository } from "@/domain/notifications/notification.repository.interface.js";
import { INotificationProvider } from "@/domain/notifications/providers/INotificationProvider.js";
import type { MonitorActionDecision } from "@/worker/worker.helper.js";
import type { ISettingsService } from "@/domain/app-settings/app-settings.service.js";
import { ILogger } from "@/utils/logger.js";
import type { INotificationMessageBuilder, IncidentResolvedVia } from "@/domain/notifications/notification.message-builder.js";
import type { NotificationChannel } from "@/domain/notifications/notification.type.js";
import { resolveWebhookAddresses } from "@/domain/notifications/notification.webhook-routes.js";

export type NotificationProviderRegistry = Record<NotificationChannel, INotificationProvider>;

/** One delivery attempt per webhook the routing resolved to. `label` is the
 *  matching route's name (or "default" for the fallback address). */
export interface RoutingTestResult {
	deliveries: Array<{ label: string; delivered: boolean }>;
}

export interface INotificationsService {
	createNotification: (notificationData: Partial<Notification>, userId: string, teamId: string) => Promise<Notification>;
	findById: (id: string, teamId: string) => Promise<Notification>;
	findNotificationsByTeamId: (teamId: string) => Promise<Notification[]>;
	updateById(id: string, teamId: string, updateData: Partial<Notification>): Promise<Notification>;
	deleteById: (id: string, teamId: string) => Promise<Notification>;
	handleNotifications: (monitor: Monitor, monitorStatusResponse: MonitorStatusResponse, decision: MonitorActionDecision) => Promise<boolean>;

	sendTestNotification: (notification: Partial<Notification>) => Promise<boolean>;
	testAllNotifications: (notificationIds: string[]) => Promise<boolean>;
	sendRoutingTest: (notification: Partial<Notification>, tagIds: string[]) => Promise<RoutingTestResult>;
	/** Operator closed an incident by hand: tell the monitor's channels, routed by its tags. */
	sendIncidentResolvedNotification: (
		monitor: Monitor,
		incident: Incident,
		resolvedByEmail?: string | null,
		comment?: string | null,
		resolution?: IncidentResolvedVia
	) => Promise<boolean>;
}

const SERVICE_NAME = "NotificationsService";

export class NotificationsService implements INotificationsService {
	static SERVICE_NAME = SERVICE_NAME;

	private notificationsRepository: INotificationsRepository;
	private monitorsRepository: IMonitorsRepository;
	private providers: NotificationProviderRegistry;
	private settingsService: ISettingsService;
	private logger: ILogger;
	private notificationMessageBuilder: INotificationMessageBuilder;

	constructor({
		notificationsRepository,
		monitorsRepository,
		providers,
		settingsService,
		logger,
		notificationMessageBuilder,
	}: {
		notificationsRepository: INotificationsRepository;
		monitorsRepository: IMonitorsRepository;
		providers: NotificationProviderRegistry;
		settingsService: ISettingsService;
		logger: ILogger;
		notificationMessageBuilder: INotificationMessageBuilder;
	}) {
		this.notificationsRepository = notificationsRepository;
		this.monitorsRepository = monitorsRepository;
		this.providers = providers;
		this.settingsService = settingsService;
		this.logger = logger;
		this.notificationMessageBuilder = notificationMessageBuilder;
	}

	private send = async (
		notification: Notification,
		monitor: Monitor,
		monitorStatusResponse: MonitorStatusResponse,
		decision: MonitorActionDecision,
		notificationMessage: NotificationMessage | undefined
	): Promise<boolean> => {
		if (!notificationMessage) {
			this.logger.warn({
				message: "Notification message not provided",
				service: SERVICE_NAME,
				method: "send",
			});
			return false;
		}

		// Route to provider based on notification type
		const provider = this.providers[notification.type];
		if (!provider) {
			this.logger.warn({
				message: `Unknown notification type: ${notification.type}`,
				service: SERVICE_NAME,
				method: "send",
			});
			return false;
		}
		return await provider.sendMessage(notification, notificationMessage);
	};

	private sendNotifications = async (monitor: Monitor, monitorStatusResponse: MonitorStatusResponse, decision: MonitorActionDecision) => {
		const notificationIds = monitor.notifications ?? [];
		const notifications = await this.notificationsRepository.findNotificationsByIds(notificationIds);

		// Build notification message once for all notifications
		const settings = this.settingsService.getSettings();
		const clientHost = settings.clientHost || "Host not defined";
		const notificationMessage = this.notificationMessageBuilder.buildMessage(monitor, monitorStatusResponse, decision, clientHost);

		return await this.dispatch(notifications, monitor, monitorStatusResponse, decision, notificationMessage, "sendNotifications");
	};

	private dispatch = async (
		notifications: Notification[],
		monitor: Monitor,
		monitorStatusResponse: MonitorStatusResponse,
		decision: MonitorActionDecision,
		notificationMessage: NotificationMessage | undefined,
		method: string
	) => {
		const tasks = notifications.map((notification) => this.send(notification, monitor, monitorStatusResponse, decision, notificationMessage));

		const outcomes = await Promise.all(tasks);
		const succeeded = outcomes.filter(Boolean).length;
		const failed = outcomes.length - succeeded;
		if (failed > 0) {
			this.logger.warn({
				message: `Notification send completed with ${succeeded} success, ${failed} failure(s)`,
				service: SERVICE_NAME,
				method,
			});
		}
		// Return true if all notifications succeeded
		return succeeded === notifications.length;
	};

	sendIncidentResolvedNotification = async (
		monitor: Monitor,
		incident: Incident,
		resolvedByEmail?: string | null,
		comment?: string | null,
		resolution: IncidentResolvedVia = "manual"
	) => {
		const notificationIds = monitor.notifications ?? [];
		if (notificationIds.length === 0) {
			return true;
		}
		const notifications = await this.notificationsRepository.findNotificationsByIds(notificationIds);
		const settings = this.settingsService.getSettings();
		const clientHost = settings.clientHost || "Host not defined";
		const notificationMessage = this.notificationMessageBuilder.buildIncidentResolvedMessage(
			monitor,
			incident,
			clientHost,
			resolvedByEmail,
			comment,
			resolution
		);
		// Providers only read the message; the status/decision arguments exist for the
		// worker path's signature. A manual resolve has no check behind it.
		const syntheticStatus = {
			monitorId: monitor.id,
			teamId: monitor.teamId,
			type: monitor.type,
			status: monitor.status === "up",
		} as MonitorStatusResponse;
		const decision: MonitorActionDecision = {
			shouldCreateIncident: false,
			shouldResolveIncident: true,
			shouldSendNotification: true,
			incidentReason: null,
			notificationReason: "status_change",
		};
		return await this.dispatch(notifications, monitor, syntheticStatus, decision, notificationMessage, "sendIncidentResolvedNotification");
	};

	handleNotifications = async (monitor: Monitor, monitorStatusResponse: MonitorStatusResponse, decision: MonitorActionDecision) => {
		if (!decision.shouldSendNotification) {
			return false;
		}

		// Send notifications based on decision
		return await this.sendNotifications(monitor, monitorStatusResponse, decision);
	};

	sendTestNotification = async (notification: Partial<Notification>) => {
		const type = notification.type;
		if (!type) {
			this.logger.warn({
				message: "Notification type not provided",
				service: SERVICE_NAME,
				method: "sendTestNotification",
			});
			return false;
		}

		const provider = this.providers[type];
		if (!provider) {
			this.logger.warn({
				message: `Unknown notification type: ${notification.type}`,
				service: SERVICE_NAME,
				method: "sendTestNotification",
			});
			return false;
		}
		return await provider.sendTestAlert(notification);
	};

	/**
	 * Exercise the real routing for a monitor that carries `tagIds`: resolve the
	 * webhooks exactly as sendMessage would, then post the test alert to each.
	 * Uses the form's unsaved values so routes can be checked before saving.
	 */
	sendRoutingTest = async (notification: Partial<Notification>, tagIds: string[]): Promise<RoutingTestResult> => {
		const type = notification.type;
		const provider = type ? this.providers[type] : undefined;
		if (!provider) {
			this.logger.warn({
				message: `Unknown notification type: ${notification.type}`,
				service: SERVICE_NAME,
				method: "sendRoutingTest",
			});
			return { deliveries: [] };
		}

		const routes = notification.webhookRoutes ?? [];
		const addresses = resolveWebhookAddresses(
			{ address: notification.address, webhookRoutes: routes, alsoNotifyDefault: notification.alsoNotifyDefault },
			tagIds
		);
		const labelFor = (address: string) =>
			routes.find((route) => route.address.trim() === address)?.name?.trim() || (address === notification.address?.trim() ? "default" : "route");

		const deliveries = await Promise.all(
			addresses.map(async (address) => ({
				label: labelFor(address),
				delivered: await provider.sendTestAlert({ ...notification, address }),
			}))
		);
		return { deliveries };
	};

	testAllNotifications = async (notificationIds: string[]) => {
		const notifications = await this.notificationsRepository.findNotificationsByIds(notificationIds);
		const tasks = notifications.map((notification) => this.sendTestNotification(notification));
		const outcomes = await Promise.all(tasks);
		const succeeded = outcomes.filter(Boolean).length;
		const failed = outcomes.length - succeeded;
		if (failed > 0) {
			return false;
		}
		return true;
	};

	createNotification = async (notificationData: Partial<Notification>, userId: string, teamId: string): Promise<Notification> => {
		notificationData.userId = userId;
		notificationData.teamId = teamId;
		return await this.notificationsRepository.create(notificationData);
	};

	findById = async (id: string, teamId: string): Promise<Notification> => {
		return await this.notificationsRepository.findById(id, teamId);
	};

	findNotificationsByTeamId = async (teamId: string): Promise<Notification[]> => {
		return await this.notificationsRepository.findByTeamId(teamId);
	};

	updateById = async (id: string, teamId: string, updateData: Partial<Notification>): Promise<Notification> => {
		return await this.notificationsRepository.updateById(id, teamId, updateData);
	};

	deleteById = async (id: string, teamId: string): Promise<Notification> => {
		await this.monitorsRepository.removeNotificationFromMonitors(id);
		const deleted = await this.notificationsRepository.deleteById(id, teamId);
		return deleted;
	};
}
