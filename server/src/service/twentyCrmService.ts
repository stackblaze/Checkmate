import { ILogger } from "@/utils/logger.js";

const SERVICE_NAME = "TwentyCrmService";
const DEFAULT_API_URL = "https://crm.stackblaze.cloud";
const DEFAULT_STATUS_LIST_ID = "53a52543-d89d-4479-8832-758e5efaca80";
const SUBSCRIBER_JOB_TITLE = "Status page subscriber";

export type StatusPageSubscriberInput = {
	email: string;
	companyName: string;
	statusPageUrl: string;
};

export type StatusPageSubscriberResult = {
	personId: string;
};

type TwentyCreatePersonResponse = {
	data?: { createPerson?: { id?: string } };
};

type TwentyCreateListMemberResponse = {
	data?: { createMessageListMember?: { id?: string } };
};

export interface ITwentyCrmService {
	enabled(): boolean;
	upsertStatusPageSubscriber(input: StatusPageSubscriberInput): Promise<StatusPageSubscriberResult>;
}

const titleCaseWord = (value: string): string => {
	if (!value) {
		return value;
	}
	return value.charAt(0).toUpperCase() + value.slice(1);
};

export const nameFromEmail = (email: string): { firstName: string; lastName: string } => {
	const local = email.split("@")[0] ?? "Subscriber";
	const cleaned = (local.split("+")[0] ?? local).replace(/[._-]+/g, " ").trim();
	const parts = cleaned.split(/\s+/).filter(Boolean);
	if (parts.length === 0) {
		return { firstName: "Subscriber", lastName: "" };
	}
	const first = parts[0] ?? "Subscriber";
	if (parts.length === 1) {
		return { firstName: titleCaseWord(first), lastName: "" };
	}
	return {
		firstName: titleCaseWord(first),
		lastName: parts.slice(1).map(titleCaseWord).join(" "),
	};
};

export class TwentyCrmService implements ITwentyCrmService {
	static SERVICE_NAME = SERVICE_NAME;

	constructor(private logger: ILogger) {}

	private get baseUrl(): string {
		return (process.env.TWENTY_CRM_API_URL || DEFAULT_API_URL).trim().replace(/\/+$/, "");
	}

	private get apiKey(): string {
		return (process.env.TWENTY_CRM_API_KEY || "").trim();
	}

	private get statusListId(): string {
		return (process.env.TWENTY_CRM_STATUS_LIST_ID || DEFAULT_STATUS_LIST_ID).trim();
	}

	enabled(): boolean {
		return Boolean(this.apiKey);
	}

	private async request<T>(path: string, init: RequestInit & { upsert?: boolean } = {}): Promise<T> {
		const { upsert, ...fetchInit } = init;
		const url = new URL(`${this.baseUrl}${path}`);
		if (upsert) {
			url.searchParams.set("upsert", "true");
		}

		const res = await fetch(url, {
			...fetchInit,
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				"Content-Type": "application/json",
				...(fetchInit.headers ?? {}),
			},
			signal: AbortSignal.timeout(10_000),
		});

		const data = (await res.json().catch(() => ({}))) as {
			messages?: string[];
			message?: string;
		} & T;

		if (!res.ok) {
			const message = data.messages?.join(", ") || data.message || `Twenty CRM HTTP ${res.status}`;
			throw new Error(message);
		}

		return data;
	}

	private async addToStatusList(personId: string): Promise<void> {
		const listId = this.statusListId;
		if (!listId) {
			return;
		}

		try {
			await this.request<TwentyCreateListMemberResponse>("/rest/messageListMembers", {
				method: "POST",
				body: JSON.stringify({ listId, personId }),
			});
		} catch (error: unknown) {
			this.logger.warn({
				message: error instanceof Error ? error.message : "Failed to add Twenty list member",
				service: SERVICE_NAME,
				method: "addToStatusList",
				details: { personId, listId },
			});
		}
	}

	upsertStatusPageSubscriber = async (input: StatusPageSubscriberInput): Promise<StatusPageSubscriberResult> => {
		if (!this.enabled()) {
			throw new Error("Twenty CRM is not configured");
		}

		const email = input.email.trim().toLowerCase();
		const { firstName, lastName } = nameFromEmail(email);

		const personRes = await this.request<TwentyCreatePersonResponse>("/rest/people", {
			method: "POST",
			upsert: true,
			body: JSON.stringify({
				name: { firstName, lastName },
				emails: { primaryEmail: email },
				jobTitle: SUBSCRIBER_JOB_TITLE,
			}),
		});

		const personId = personRes.data?.createPerson?.id;
		if (!personId) {
			throw new Error("Twenty CRM did not return a person id");
		}

		await this.addToStatusList(personId);

		this.logger.info({
			message: "Upserted status page subscriber in Twenty CRM",
			service: SERVICE_NAME,
			method: "upsertStatusPageSubscriber",
			details: { personId, companyName: input.companyName, statusPageUrl: input.statusPageUrl },
		});

		return { personId };
	};
}
