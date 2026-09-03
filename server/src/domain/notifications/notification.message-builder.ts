import type { Monitor } from "@/domain/monitors/monitor.type.js";
import type { Incident } from "@/domain/incidents/incident.type.js";

/** Who/what closed the incident outside the worker: an operator, or an ignored-disks edit. */
export type IncidentResolvedVia = "manual" | "ignored_disks";
import { filterDisksForAlerts } from "@/domain/monitors/disk-alert.utils.js";
import type { HardwareStatusPayload, MonitorStatusResponse } from "@/types/network.js";
import type { MonitorActionDecision } from "@/worker/worker.helper.js";
import type {
	NotificationMessage,
	NotificationType,
	NotificationSeverity,
	ThresholdBreach,
	NotificationContent,
} from "@/domain/notifications/notification.type.js";

export interface INotificationMessageBuilder {
	buildMessage(
		monitor: Monitor,
		monitorStatusResponse: MonitorStatusResponse,
		decision: MonitorActionDecision,
		clientHost: string
	): NotificationMessage;
	extractThresholdBreaches(monitor: Monitor, monitorStatusResponse: MonitorStatusResponse): ThresholdBreach[];
	buildIncidentResolvedMessage(
		monitor: Monitor,
		incident: Incident,
		clientHost: string,
		resolvedByEmail?: string | null,
		comment?: string | null,
		resolution?: IncidentResolvedVia
	): NotificationMessage;
}

const SERVICE_NAME = "NotificationMessageBuilder";

export class NotificationMessageBuilder implements INotificationMessageBuilder {
	static SERVICE_NAME = SERVICE_NAME;

	buildMessage(
		monitor: Monitor,
		monitorStatusResponse: MonitorStatusResponse,
		decision: MonitorActionDecision,
		clientHost: string
	): NotificationMessage {
		const type = this.determineNotificationType(decision, monitor);
		const severity = this.determineSeverity(type);
		const content = this.buildContent(type, monitor, monitorStatusResponse);

		return {
			type,
			severity,
			monitor: {
				id: monitor.id,
				name: monitor.name,
				url: monitor.url,
				type: monitor.type,
				status: monitor.status,
			},
			content,
			clientHost,
			metadata: {
				teamId: monitor.teamId,
				notificationReason: decision.notificationReason || "status_change",
				tagIds: monitor.tags ?? [],
			},
		};
	}

	/**
	 * Message for an incident closed by an operator (PUT /incidents/:id/resolve).
	 * The worker never sees this transition, so it gets no status-change
	 * notification of its own; this mirrors the recovery message and carries
	 * the monitor's tags so webhook routing lands it in the same channels.
	 */
	buildIncidentResolvedMessage(
		monitor: Monitor,
		incident: Incident,
		clientHost: string,
		resolvedByEmail?: string | null,
		comment?: string | null,
		resolution: IncidentResolvedVia = "manual"
	): NotificationMessage {
		const type: NotificationType = monitor.type === "hardware" ? "threshold_resolved" : "monitor_up";
		const resolver = resolvedByEmail?.trim() || "an operator";
		const summary =
			resolution === "ignored_disks"
				? `Incident on "${monitor.name}" cleared after ${resolver} excluded disks from hardware alerts.`
				: `Incident on "${monitor.name}" was resolved manually by ${resolver}.`;
		const details = [`URL: ${monitor.url}`, `Status: ${monitor.status}`, `Type: ${monitor.type}`, `Resolved by: ${resolver}`];
		if (incident.message) {
			details.push(`Incident: ${incident.message}`);
		}
		if (comment?.trim()) {
			details.push(`Comment: ${comment.trim()}`);
		}
		const startedAt = Number(incident.startTime);
		const createdAt = Number.isFinite(startedAt) && startedAt > 0 ? new Date(startedAt) : new Date(incident.createdAt);

		return {
			type,
			severity: this.determineSeverity(type),
			monitor: {
				id: monitor.id,
				name: monitor.name,
				url: monitor.url,
				type: monitor.type,
				status: monitor.status,
			},
			content: {
				title: `Incident Resolved: ${monitor.name}`,
				summary,
				details,
				incident: { id: incident.id, url: `${clientHost}/incidents/${incident.id}`, createdAt, resolvedAt: new Date() },
				timestamp: new Date(),
			},
			clientHost,
			metadata: {
				teamId: monitor.teamId,
				notificationReason: resolution === "ignored_disks" ? "ignored_disks_resolve" : "manual_resolve",
				tagIds: monitor.tags ?? [],
			},
		};
	}

	private determineNotificationType(decision: MonitorActionDecision, monitor: Monitor): NotificationType {
		// Down status has highest priority (critical)
		if (monitor.status === "down") {
			return "monitor_down";
		}

		// Threshold breach (only if not down)
		if (decision.notificationReason === "threshold_breach") {
			return "threshold_breach";
		}

		// Recovery from threshold breach (only for hardware monitors)
		if (decision.notificationReason === "status_change" && monitor.status === "up" && monitor.type === "hardware") {
			return "threshold_resolved";
		}

		// Standard recovery (up)
		if (monitor.status === "up") {
			return "monitor_up";
		}

		// Default to monitor_up for any other case
		return "monitor_up";
	}

	private determineSeverity(type: NotificationType): NotificationSeverity {
		switch (type) {
			case "monitor_down":
				return "critical";
			case "threshold_breach":
				return "warning";
			case "monitor_up":
			case "threshold_resolved":
				return "success";
			case "test":
				return "info";
			default:
				return "info";
		}
	}

	private buildContent(type: NotificationType, monitor: Monitor, monitorStatusResponse: MonitorStatusResponse): NotificationContent {
		switch (type) {
			case "monitor_down":
				return this.buildMonitorDownContent(monitor, monitorStatusResponse);
			case "monitor_up":
				return this.buildMonitorUpContent(monitor);
			case "threshold_breach":
				return this.buildThresholdBreachContent(monitor, monitorStatusResponse as MonitorStatusResponse<HardwareStatusPayload>);
			case "threshold_resolved":
				return this.buildThresholdResolvedContent(monitor);
			default:
				return this.buildDefaultContent(monitor);
		}
	}

	private buildMonitorDownContent(monitor: Monitor, monitorStatusResponse: MonitorStatusResponse): NotificationContent {
		const title = `Monitor Down: ${monitor.name}`;
		const summary = `Monitor "${monitor.name}" is currently down and unreachable.`;
		const details = [`URL: ${monitor.url}`, `Status: Down`, `Type: ${monitor.type}`];

		// Add response code if available
		if (monitorStatusResponse.code) {
			details.push(`Response Code: ${monitorStatusResponse.code}`);
		}

		// Add error message if available
		if (monitorStatusResponse.message) {
			details.push(`Error: ${monitorStatusResponse.message}`);
		}

		return {
			title,
			summary,
			details,
			timestamp: new Date(),
		};
	}

	private buildMonitorUpContent(monitor: Monitor): NotificationContent {
		const title = `Monitor Recovered: ${monitor.name}`;
		const summary = `Monitor "${monitor.name}" is back up and operational.`;
		const details = [`URL: ${monitor.url}`, `Status: Up`, `Type: ${monitor.type}`];

		return {
			title,
			summary,
			details,
			timestamp: new Date(),
		};
	}

	private buildThresholdBreachContent(monitor: Monitor, monitorStatusResponse: MonitorStatusResponse<HardwareStatusPayload>): NotificationContent {
		const title = `Threshold Exceeded: ${monitor.name}`;
		const summary = `Monitor "${monitor.name}" has exceeded one or more thresholds.`;
		const details = [`URL: ${monitor.url}`, `Status: Threshold exceeded`, `Type: ${monitor.type}`];

		const thresholds = this.extractThresholdBreaches(monitor, monitorStatusResponse);

		return {
			title,
			summary,
			details,
			thresholds,
			timestamp: new Date(),
		};
	}

	private buildThresholdResolvedContent(monitor: Monitor): NotificationContent {
		const title = `Thresholds Resolved: ${monitor.name}`;
		const summary = `Monitor "${monitor.name}" thresholds have returned to normal.`;
		const details = [`URL: ${monitor.url}`, `Status: Up`, `Type: ${monitor.type}`];

		return {
			title,
			summary,
			details,
			timestamp: new Date(),
		};
	}

	private buildDefaultContent(monitor: Monitor): NotificationContent {
		return {
			title: `Monitor: ${monitor.name}`,
			summary: `Status update for monitor "${monitor.name}".`,
			details: [`URL: ${monitor.url}`, `Status: ${monitor.status}`, `Type: ${monitor.type}`],
			timestamp: new Date(),
		};
	}

	public extractThresholdBreaches(monitor: Monitor, monitorStatusResponse: MonitorStatusResponse<HardwareStatusPayload>): ThresholdBreach[] {
		const breaches: ThresholdBreach[] = [];

		// Check if this is a hardware monitor with threshold data
		if (monitor.type !== "hardware" || !monitorStatusResponse.payload || typeof monitorStatusResponse.payload === "string") {
			return breaches;
		}

		// Cast to HardwareStatusPayload type
		const payload = monitorStatusResponse.payload;
		const hardware = payload.data;

		if (!hardware) {
			return breaches;
		}

		// Note: usage_percent values in hardware payload are decimals (0-1)
		if (monitor.cpuAlertThreshold !== undefined && monitor.cpuAlertThreshold !== null && hardware.cpu?.usage_percent !== undefined) {
			const cpuUsageDecimal = hardware.cpu.usage_percent;
			const cpuPercent = cpuUsageDecimal * 100;
			const threshold = monitor.cpuAlertThreshold;
			if (cpuPercent > threshold) {
				breaches.push({
					metric: "cpu",
					currentValue: cpuPercent,
					threshold,
					unit: "%",
					formattedValue: `${cpuPercent.toFixed(1)}%`,
				});
			}
		}

		// Memory threshold breach
		if (monitor.memoryAlertThreshold !== undefined && monitor.memoryAlertThreshold !== null && hardware.memory?.usage_percent !== undefined) {
			const memoryUsageDecimal = hardware.memory.usage_percent;
			const memoryPercent = memoryUsageDecimal * 100;
			const threshold = monitor.memoryAlertThreshold;
			if (memoryPercent > threshold) {
				breaches.push({
					metric: "memory",
					currentValue: memoryPercent,
					threshold,
					unit: "%",
					formattedValue: `${memoryPercent.toFixed(1)}%`,
				});
			}
		}

		// Disk threshold breach
		if (monitor.diskAlertThreshold !== undefined && monitor.diskAlertThreshold !== null && Array.isArray(hardware.disk)) {
			const disksForAlerts = filterDisksForAlerts(hardware.disk, monitor.ignoredDisks);
			let maxDiskUsageDecimal = 0;
			for (const disk of disksForAlerts) {
				if (disk.usage_percent !== undefined && disk.usage_percent > maxDiskUsageDecimal) {
					maxDiskUsageDecimal = disk.usage_percent;
				}
			}
			const maxDiskPercent = maxDiskUsageDecimal * 100;
			const threshold = monitor.diskAlertThreshold;
			if (maxDiskPercent > threshold) {
				breaches.push({
					metric: "disk",
					currentValue: maxDiskPercent,
					threshold,
					unit: "%",
					formattedValue: `${maxDiskPercent.toFixed(1)}%`,
				});
			}
		}

		// Temperature threshold breach
		if (monitor.tempAlertThreshold !== undefined && monitor.tempAlertThreshold !== null && hardware.cpu?.temperature) {
			// Temperature is an array in cpu.temperature
			const temps = Array.isArray(hardware.cpu.temperature) ? hardware.cpu.temperature : [hardware.cpu.temperature];
			const maxTemp = Math.max(...temps.filter((t: number) => !isNaN(t)));
			const threshold = monitor.tempAlertThreshold;
			if (maxTemp >= threshold) {
				breaches.push({
					metric: "temp",
					currentValue: maxTemp,
					threshold,
					unit: "°C",
					formattedValue: `${maxTemp.toFixed(1)}°C`,
				});
			}
		}

		return breaches;
	}
}
