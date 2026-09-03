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
		fetchMock
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: { createPerson: { id: "person-1" } } }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: { createMessageListMember: { id: "member-1" } } }),
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
		});

		expect(result).toEqual({ personId: "person-1" });
		expect(fetchMock).toHaveBeenCalledTimes(2);
		const [peopleUrl, peopleInit] = fetchMock.mock.calls[0] as [URL, RequestInit];
		expect(String(peopleUrl)).toBe("https://crm.example.com/rest/people?upsert=true");
		expect(JSON.parse(String(peopleInit.body))).toEqual({
			name: { firstName: "Ada", lastName: "Lovelace" },
			emails: { primaryEmail: "ada.lovelace@example.com" },
			jobTitle: "Status page subscriber",
		});
	});
});
