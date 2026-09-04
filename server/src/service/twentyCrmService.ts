import { ILogger } from "@/utils/logger.js";

const SERVICE_NAME = "TwentyCrmService";
const DEFAULT_API_URL = "https://crm.stackblaze.cloud";
const DEFAULT_STATUS_LIST_ID = "53a52543-d89d-4479-8832-758e5efaca80";
const DEFAULT_SUBSCRIBE_WEBHOOK_URL =
	"https://crm.stackblaze.cloud/webhooks/workflows/61a4042f-ef82-4cd0-961d-c271b0531c01/04f48d31-742d-49ce-847c-5055456fc7e0";
const DEFAULT_UNSUBSCRIBE_WEBHOOK_URL =
	"https://crm.stackblaze.cloud/webhooks/workflows/61a4042f-ef82-4cd0-961d-c271b0531c01/23fa978a-bb7b-4220-a474-b9dc8936bfdd";
const SUBSCRIBER_JOB_TITLE = "Status page subscriber";

export type StatusPageSubscriberInput = {
	email: string;
	companyName: string;
	statusPageUrl: string;
	unsubscribeUrl?: string;
};

export type StatusPageSubscriberResult = {
	personId?: string;
};

type TwentyCreatePersonResponse = {
	data?: { createPerson?: { id?: string }; people?: Array<{ id?: string }> };
	people?: Array<{ id?: string }>;
};

type TwentyListMembersResponse = {
	data?: { messageListMembers?: Array<{ id?: string }> };
	messageListMembers?: Array<{ id?: string }>;
};

type TwentyCreateListMemberResponse = {
	data?: { createMessageListMember?: { id?: string } };
};

export interface ITwentyCrmService {
	enabled(): boolean;
	sendsSubscribeEmail(): boolean;
	sendsUnsubscribeEmail(): boolean;
	upsertStatusPageSubscriber(input: StatusPageSubscriberInput): Promise<StatusPageSubscriberResult>;
	removeStatusPageSubscriber(input: StatusPageSubscriberInput): Promise<StatusPageSubscriberResult>;
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

	private get subscribeWebhookUrl(): string {
		return (process.env.TWENTY_CRM_SUBSCRIBE_WEBHOOK_URL || DEFAULT_SUBSCRIBE_WEBHOOK_URL).trim();
	}

	private get unsubscribeWebhookUrl(): string {
		return (process.env.TWENTY_CRM_UNSUBSCRIBE_WEBHOOK_URL || DEFAULT_UNSUBSCRIBE_WEBHOOK_URL).trim();
	}

	enabled(): boolean {
		return Boolean(this.apiKey);
	}

	sendsSubscribeEmail(): boolean {
		return Boolean(this.subscribeWebhookUrl);
	}

	sendsUnsubscribeEmail(): boolean {
		return Boolean(this.unsubscribeWebhookUrl);
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

	private async findPersonIdByEmail(email: string): Promise<string | null> {
		const filter = `emails.primaryEmail[eq]:"${email.replace(/"/g, "")}"`;
		const data = await this.request<TwentyCreatePersonResponse>(`/rest/people?limit=1&filter=${encodeURIComponent(filter)}`);
		const person = data.data?.people?.[0] ?? data.people?.[0];
		return person?.id || null;
	}

	private async removeFromStatusList(personId: string): Promise<void> {
		const listId = this.statusListId;
		if (!listId) {
			return;
		}

		const filter = `and(personId[eq]:${personId},listId[eq]:${listId})`;
		const data = await this.request<TwentyListMembersResponse>(
			`/rest/messageListMembers?filter=${encodeURIComponent(filter)}`
		);
		const members = data.data?.messageListMembers ?? data.messageListMembers ?? [];
		for (const member of members) {
			if (!member.id) {
				continue;
			}
			try {
				await this.request(`/rest/messageListMembers/${member.id}`, { method: "DELETE" });
			} catch (error: unknown) {
				this.logger.warn({
					message: error instanceof Error ? error.message : "Failed to remove Twenty list member",
					service: SERVICE_NAME,
					method: "removeFromStatusList",
					details: { personId, listId, memberId: member.id },
				});
			}
		}
	}

	private async notifyWorkflow(
		webhookUrl: string,
		payload: {
			email: string;
			firstName: string;
			lastName: string;
			companyName: string;
			statusPageUrl: string;
			unsubscribeUrl?: string;
		}
	): Promise<void> {
		if (!webhookUrl) {
			return;
		}

		const res = await fetch(webhookUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(10_000),
		});

		if (!res.ok) {
			const message = await res.text().catch(() => `HTTP ${res.status}`);
			throw new Error(`Twenty status webhook failed: ${message}`);
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
		await this.notifyWorkflow(this.subscribeWebhookUrl, {
			email,
			firstName,
			lastName,
			companyName: input.companyName,
			statusPageUrl: input.statusPageUrl,
			unsubscribeUrl: input.unsubscribeUrl,
		});

		this.logger.info({
			message: "Upserted status page subscriber in Twenty CRM",
			service: SERVICE_NAME,
			method: "upsertStatusPageSubscriber",
			details: { personId, companyName: input.companyName, statusPageUrl: input.statusPageUrl },
		});

		return { personId };
	};

	removeStatusPageSubscriber = async (input: StatusPageSubscriberInput): Promise<StatusPageSubscriberResult> => {
		if (!this.enabled()) {
			throw new Error("Twenty CRM is not configured");
		}

		const email = input.email.trim().toLowerCase();
		const { firstName, lastName } = nameFromEmail(email);
		let personId: string | undefined;

		try {
			personId = (await this.findPersonIdByEmail(email)) ?? undefined;
			if (personId) {
				await this.removeFromStatusList(personId);
			}
		} catch (error: unknown) {
			this.logger.warn({
				message: error instanceof Error ? error.message : "Failed to remove status page subscriber",
				service: SERVICE_NAME,
				method: "removeStatusPageSubscriber",
			});
		}

		await this.notifyWorkflow(this.unsubscribeWebhookUrl, {
			email,
			firstName,
			lastName,
			companyName: input.companyName,
			statusPageUrl: input.statusPageUrl,
		});

		this.logger.info({
			message: "Removed status page subscriber in Twenty CRM",
			service: SERVICE_NAME,
			method: "removeStatusPageSubscriber",
			details: { personId, companyName: input.companyName, statusPageUrl: input.statusPageUrl },
		});

		return { personId };
	};
}
