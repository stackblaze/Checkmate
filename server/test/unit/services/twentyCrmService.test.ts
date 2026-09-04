import { describe, expect, it, jest, beforeEach, afterEach } from "@jest/globals";
import { nameFromEmail, TwentyCrmService } from "../../../src/service/twentyCrmService.ts";

describe("nameFromEmail", () => {
	it("splits dotted local parts into first and last name", () => {
		expect(nameFromEmail("ada.lovelace@example.com")).toEqual({ firstName: "Ada", lastName: "Lovelace" });
	});

	it("uses a single token as the first name", () => {
		expect(nameFromEmail("ada@example.com")).toEqual({ firstName: "Ada", lastName: "" });
	});
});

describe("TwentyCrmService", () => {
	const originalEnv = { ...process.env };
	const fetchMock = jest.fn();

	beforeEach(() => {
		process.env.TWENTY_CRM_API_URL = "https://crm.example.com";
		process.env.TWENTY_CRM_API_KEY = "test-key";
		process.env.TWENTY_CRM_STATUS_LIST_ID = "list-1";
		(globalThis as { fetch?: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		fetchMock.mockReset();
	});

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it("upserts a person and adds them to the status list", async () => {
		process.env.TWENTY_CRM_SUBSCRIBE_WEBHOOK_URL = "https://crm.example.com/webhooks/subscribe";
		fetchMock
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: { createPerson: { id: "person-1" } } }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: { createMessageListMember: { id: "member-1" } } }),
			})
			.mockResolvedValueOnce({
				ok: true,
				text: async () => "",
			});

		const service = new TwentyCrmService({
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
		} as any);

		const result = await service.upsertStatusPageSubscriber({
			email: "Ada.Lovelace@example.com",
			companyName: "Stackblaze",
			statusPageUrl: "https://status.stackblaze.cloud/status/public/stackblaze",
			unsubscribeUrl: "https://status.stackblaze.cloud/status/public/stackblaze/unsubscribe?email=ada.lovelace%40example.com",
		});

		expect(result).toEqual({ personId: "person-1" });
		expect(fetchMock).toHaveBeenCalledTimes(3);
		const [webhookUrl, webhookInit] = fetchMock.mock.calls[2] as [string, RequestInit];
		expect(webhookUrl).toBe("https://crm.example.com/webhooks/subscribe");
		expect(JSON.parse(String(webhookInit.body))).toEqual({
			email: "ada.lovelace@example.com",
			firstName: "Ada",
			lastName: "Lovelace",
			companyName: "Stackblaze",
			statusPageUrl: "https://status.stackblaze.cloud/status/public/stackblaze",
			unsubscribeUrl:
				"https://status.stackblaze.cloud/status/public/stackblaze/unsubscribe?email=ada.lovelace%40example.com",
		});
		const [peopleUrl, peopleInit] = fetchMock.mock.calls[0] as [URL, RequestInit];
		expect(String(peopleUrl)).toBe("https://crm.example.com/rest/people?upsert=true");
		expect(JSON.parse(String(peopleInit.body))).toEqual({
			name: { firstName: "Ada", lastName: "Lovelace" },
			emails: { primaryEmail: "ada.lovelace@example.com" },
			jobTitle: "Status page subscriber",
		});
	});

	it("removes a list member and notifies the unsubscribe workflow", async () => {
		process.env.TWENTY_CRM_UNSUBSCRIBE_WEBHOOK_URL = "https://crm.example.com/webhooks/unsubscribe";
		fetchMock
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: { people: [{ id: "person-1" }] } }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: { messageListMembers: [{ id: "member-1" }] } }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			})
			.mockResolvedValueOnce({
				ok: true,
				text: async () => "",
			});

		const service = new TwentyCrmService({
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
		} as any);

		const result = await service.removeStatusPageSubscriber({
			email: "Ada.Lovelace@example.com",
			companyName: "Stackblaze",
			statusPageUrl: "https://status.stackblaze.cloud/status/public/stackblaze",
		});

		expect(result).toEqual({ personId: "person-1" });
		expect(fetchMock).toHaveBeenCalledTimes(4);
		const peopleUrl = String(fetchMock.mock.calls[0][0]);
		expect(peopleUrl).toContain("/rest/people?");
		expect(decodeURIComponent(peopleUrl)).toContain('emails.primaryEmail[eq]:"ada.lovelace@example.com"');
		expect(String(fetchMock.mock.calls[2][0])).toContain("/rest/messageListMembers/member-1");
		expect((fetchMock.mock.calls[2][1] as RequestInit).method).toBe("DELETE");
		const [webhookUrl, webhookInit] = fetchMock.mock.calls[3] as [string, RequestInit];
		expect(webhookUrl).toBe("https://crm.example.com/webhooks/unsubscribe");
		expect(JSON.parse(String(webhookInit.body))).toEqual({
			email: "ada.lovelace@example.com",
			firstName: "Ada",
			lastName: "Lovelace",
			companyName: "Stackblaze",
			statusPageUrl: "https://status.stackblaze.cloud/status/public/stackblaze",
		});
	});
});
