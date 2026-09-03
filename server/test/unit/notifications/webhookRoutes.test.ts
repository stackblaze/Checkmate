import { describe, expect, it } from "@jest/globals";
import { resolveWebhookAddresses } from "@/domain/notifications/notification.webhook-routes.js";
import type { Notification } from "@/domain/notifications/notification.type.js";

const makeNotification = (overrides?: Partial<Notification>): Pick<Notification, "address" | "webhookRoutes" | "alsoNotifyDefault"> => ({
	address: "https://discord.com/api/webhooks/default",
	...overrides,
});

describe("resolveWebhookAddresses", () => {
	it("uses the default webhook when no routes are configured", () => {
		expect(resolveWebhookAddresses(makeNotification(), ["tag-kamaji"])).toEqual(["https://discord.com/api/webhooks/default"]);
	});

	it("uses the default webhook when no monitor tags match a route", () => {
		const notification = makeNotification({
			webhookRoutes: [{ address: "https://discord.com/api/webhooks/kamaji", tagIds: ["tag-kamaji"] }],
		});
		expect(resolveWebhookAddresses(notification, ["tag-platform"])).toEqual(["https://discord.com/api/webhooks/default"]);
	});

	it("routes to every matching webhook", () => {
		const notification = makeNotification({
			webhookRoutes: [
				{ address: "https://discord.com/api/webhooks/kamaji", tagIds: ["tag-kamaji"] },
				{ address: "https://discord.com/api/webhooks/east", tagIds: ["tag-east"] },
				{ address: "https://discord.com/api/webhooks/platform", tagIds: ["tag-platform"] },
			],
		});
		expect(resolveWebhookAddresses(notification, ["tag-kamaji", "tag-east"])).toEqual([
			"https://discord.com/api/webhooks/kamaji",
			"https://discord.com/api/webhooks/east",
		]);
	});

	it("deduplicates matching webhook URLs", () => {
		const notification = makeNotification({
			webhookRoutes: [
				{ address: "https://discord.com/api/webhooks/shared", tagIds: ["tag-kamaji"] },
				{ address: "https://discord.com/api/webhooks/shared", tagIds: ["tag-east"] },
			],
		});
		expect(resolveWebhookAddresses(notification, ["tag-kamaji", "tag-east"])).toEqual(["https://discord.com/api/webhooks/shared"]);
	});

	it("also sends to the default webhook when alsoNotifyDefault is set", () => {
		const notification = makeNotification({
			alsoNotifyDefault: true,
			webhookRoutes: [{ address: "https://discord.com/api/webhooks/kamaji", tagIds: ["tag-kamaji"] }],
		});
		expect(resolveWebhookAddresses(notification, ["tag-kamaji"])).toEqual([
			"https://discord.com/api/webhooks/kamaji",
			"https://discord.com/api/webhooks/default",
		]);
	});

	it("does not duplicate the default webhook when it is also a matching route", () => {
		const notification = makeNotification({
			alsoNotifyDefault: true,
			webhookRoutes: [{ address: "https://discord.com/api/webhooks/default", tagIds: ["tag-kamaji"] }],
		});
		expect(resolveWebhookAddresses(notification, ["tag-kamaji"])).toEqual(["https://discord.com/api/webhooks/default"]);
	});

	it("returns an empty list when no default or matching route exists", () => {
		expect(resolveWebhookAddresses({ webhookRoutes: [] }, ["tag-kamaji"])).toEqual([]);
	});
});
