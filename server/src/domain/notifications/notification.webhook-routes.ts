import type { Notification, WebhookRoute } from "@/domain/notifications/notification.type.js";

export const resolveWebhookAddresses = (
	notification: Pick<Notification, "address" | "webhookRoutes" | "alsoNotifyDefault">,
	tagIds: string[] = []
): string[] => {
	const routes: WebhookRoute[] = notification.webhookRoutes ?? [];
	const monitorTags = new Set(tagIds);
	const matched = [
		...new Set(
			routes
				.filter((route) => route.tagIds.some((tagId) => monitorTags.has(tagId)))
				.map((route) => route.address.trim())
				.filter(Boolean)
		),
	];
	const fallback = notification.address?.trim();

	if (matched.length === 0) {
		return fallback ? [fallback] : [];
	}

	if (notification.alsoNotifyDefault && fallback && !matched.includes(fallback)) {
		return [...matched, fallback];
	}

	return matched;
};
