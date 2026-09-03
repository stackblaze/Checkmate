const SERVICE_NAME = "DiscordProvider";
import type { MonitorType } from "@/domain/monitors/monitor.type.js";
import { supportsUptimeDetails } from "@/domain/monitors/monitor.type.js";
import type { AlertDiscordPayload, DiscordEmbedField, Notification } from "@/domain/notifications/notification.type.js";
import { NotificationProvider } from "@/domain/notifications/providers/INotificationProvider.js";
import { getTestMessage } from "@/domain/notifications/providers/utils.js";
import { resolveWebhookAddresses } from "@/domain/notifications/notification.webhook-routes.js";
import type { NotificationMessage, NotificationSeverity } from "@/domain/notifications/notification.type.js";
import got from "got";

export class DiscordProvider extends NotificationProvider {
	sendTestAlert = async (notification: Partial<Notification>) => {
		if (!notification.address) {
			return false;
		}
		try {
			await got.post(notification.address, {
				json: this.buildWebhookBody({ content: getTestMessage() }, notification),
				headers: {
					"Content-Type": "application/json",
				},
				...this.gotRequestOptions(),
			});
			return true;
		} catch (error) {
			const err = error as Error;
			this.logger.warn({
				message: "Discord test alert failed",
				service: SERVICE_NAME,
				method: "sendTestAlert",
				stack: err?.stack,
			});
			return false;
		}
	};

	async sendMessage(notification: Notification, message: NotificationMessage): Promise<boolean> {
		const addresses = resolveWebhookAddresses(notification, message.metadata.tagIds ?? []);
		if (addresses.length === 0) {
			this.logger.warn({
				message: "Discord notification missing webhook URL",
				service: SERVICE_NAME,
				method: "sendMessage",
			});
			return false;
		}

		const embed = this.buildDiscordEmbed(message);
		const body = this.buildWebhookBody({ embeds: [embed] }, notification);

		const outcomes = await Promise.all(addresses.map((address) => this.postWebhook(address, body)));
		return outcomes.every(Boolean);
	}

	private buildWebhookBody(payload: Record<string, unknown>, notification: Partial<Notification>): Record<string, unknown> {
		const body: Record<string, unknown> = { ...payload };
		if (notification.discordUsername) {
			body.username = notification.discordUsername;
		}
		if (notification.discordAvatarUrl) {
			body.avatar_url = notification.discordAvatarUrl;
		}
		if (notification.discordMention && !body.content) {
			body.content = notification.discordMention;
		} else if (notification.discordMention && typeof body.content === "string") {
			body.content = `${notification.discordMention} ${body.content}`;
		}
		return body;
	}

	private async postWebhook(address: string, body: Record<string, unknown>): Promise<boolean> {
		try {
			await got.post(address, {
				json: body,
				headers: {
					"Content-Type": "application/json",
				},
				...this.gotRequestOptions(),
			});
			return true;
		} catch (error) {
			const err = error as Error;
			this.logger.warn({
				message: "Discord notification failed",
				service: SERVICE_NAME,
				method: "sendMessage",
				stack: err?.stack,
			});
			return false;
		}
	}

	private buildDiscordEmbed(message: NotificationMessage): AlertDiscordPayload {
		const colorMap: Record<NotificationSeverity, number> = {
			critical: 0xdc2626, // red-600
			warning: 0xf59e0b, // amber-500
			info: 0x3b82f6, // blue-500
			success: 0x10b981, // green-500
		};

		const color = colorMap[message.severity] ?? colorMap.info;

		const fields: Array<DiscordEmbedField> = [];

		// Add monitor details
		fields.push({
			name: "Monitor",
			value: message.monitor.name,
			inline: true,
		});

		fields.push({
			name: "Type",
			value: message.monitor.type.toUpperCase(),
			inline: true,
		});

		fields.push({
			name: "Status",
			value: message.monitor.status.charAt(0).toUpperCase() + message.monitor.status.slice(1),
			inline: true,
		});

		const monitorUrl = this.monitorUrl(message);
		if (monitorUrl) {
			fields.push({
				name: "View in Checkmate",
				value: monitorUrl,
				inline: false,
			});
		} else {
			fields.push({
				name: "URL",
				value: message.monitor.url,
				inline: false,
			});
		}

		// Add threshold breaches if present
		if (message.content.thresholds && message.content.thresholds.length > 0) {
			const thresholdLines = message.content.thresholds
				.map((t) => `• **${t.metric.toUpperCase()}**: ${t.formattedValue} (threshold: ${t.threshold}${t.unit})`)
				.join("\n");

			fields.push({
				name: "Threshold Breaches",
				value: thresholdLines,
				inline: false,
			});
		}

		// Add details if present
		if (message.content.details && message.content.details.length > 0) {
			const detailsText = message.content.details.join("\n");
			fields.push({
				name: "Details",
				value: detailsText,
				inline: false,
			});
		}

		return {
			title: message.content.title,
			description: message.content.summary,
			color,
			fields,
			timestamp: message.content.timestamp.toISOString(),
			...(monitorUrl ? { url: monitorUrl } : {}),
		};
	}

	private monitorUrl(message: NotificationMessage): string | undefined {
		const clientHost = message.clientHost?.trim();
		if (!clientHost || clientHost === "Host not defined") {
			return undefined;
		}

		if (message.monitor.type === "hardware") {
			return `${clientHost}/infrastructure/${message.monitor.id}`;
		}

		if (message.monitor.type === "pagespeed") {
			return `${clientHost}/pagespeed/${message.monitor.id}`;
		}

		if (supportsUptimeDetails(message.monitor.type as MonitorType)) {
			return `${clientHost}/uptime/${message.monitor.id}`;
		}

		return undefined;
	}
}
