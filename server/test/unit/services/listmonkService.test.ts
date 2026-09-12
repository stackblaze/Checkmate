import { describe, expect, it, jest, beforeEach, afterEach } from "@jest/globals";
import { ListmonkService } from "../../../src/service/listmonkService.ts";

const logger = {
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
} as any;

describe("ListmonkService", () => {
	const original = { ...process.env };

	beforeEach(() => {
		process.env.LISTMONK_URL = "https://news.example.test";
		process.env.LISTMONK_API_USER = "status-web";
		process.env.LISTMONK_API_TOKEN = "token";
		process.env.LISTMONK_STATUS_LIST_ID = "4";
	});

	afterEach(() => {
		process.env = { ...original };
		jest.restoreAllMocks();
	});

	it("is enabled only when user and token are set", () => {
		expect(new ListmonkService(logger).enabled()).toBe(true);
		delete process.env.LISTMONK_API_TOKEN;
		expect(new ListmonkService(logger).enabled()).toBe(false);
	});

	it("lets Checkmate send the confirmation email", () => {
		const service = new ListmonkService(logger);
		expect(service.sendsSubscribeEmail()).toBe(false);
		expect(service.sendsUnsubscribeEmail()).toBe(false);
	});

	it("adds an existing subscriber to the Status list", async () => {
		const fetchMock = jest.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: { results: [{ id: 12, email: "ada@example.com", name: "ada", status: "enabled" }] } }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});
		(globalThis as any).fetch = fetchMock;

		const result = await new ListmonkService(logger).upsertStatusPageSubscriber({
			email: "Ada@Example.com",
			companyName: "Stackblaze",
			statusPageUrl: "https://status.example/status/public/stackblaze?range=90d",
		});

		expect(result.personId).toBe("12");
		const addCall = fetchMock.mock.calls[1];
		expect(String(addCall[0])).toContain("/api/subscribers/lists");
		expect(JSON.parse(addCall[1].body)).toMatchObject({
			ids: [12],
			action: "add",
			target_list_ids: [4],
			status: "confirmed",
		});
	});
});
