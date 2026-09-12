import { ILogger } from "@/utils/logger.js";
import type {
	ITwentyCrmService,
	StatusPageSubscriberInput,
	StatusPageSubscriberResult,
} from "@/service/twentyCrmService.js";

const SERVICE_NAME = "ListmonkService";
const DEFAULT_URL = "https://news.stackblaze.cloud";
const DEFAULT_STATUS_LIST_ID = 4;

type ListmonkError = {
	message?: string;
};

type Subscriber = {
	id: number;
	email: string;
	name: string;
	status: string;
};

type SubscriberPage = {
	data?: {
		results?: Subscriber[];
	};
};

type CreateSubscriberResponse = {
	data?: { id?: number };
};

export class ListmonkService implements ITwentyCrmService {
	static SERVICE_NAME = SERVICE_NAME;

	constructor(private logger: ILogger) {}

	private get baseUrl(): string {
		return (process.env.LISTMONK_URL || DEFAULT_URL).trim().replace(/\/+$/, "");
	}

	private get apiUser(): string {
		return (process.env.LISTMONK_API_USER || "").trim();
	}

	private get apiToken(): string {
		return (process.env.LISTMONK_API_TOKEN || "").trim();
	}

	private get statusListId(): number {
		const raw = (process.env.LISTMONK_STATUS_LIST_ID || String(DEFAULT_STATUS_LIST_ID)).trim();
		const id = Number(raw);
		return Number.isFinite(id) && id > 0 ? id : DEFAULT_STATUS_LIST_ID;
	}

	enabled(): boolean {
		return Boolean(this.apiUser && this.apiToken);
	}

	sendsSubscribeEmail(): boolean {
		return false;
	}

	sendsUnsubscribeEmail(): boolean {
		return false;
	}

	private authHeader(): string {
		return `Basic ${Buffer.from(`${this.apiUser}:${this.apiToken}`).toString("base64")}`;
	}

	private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
		const res = await fetch(`${this.baseUrl}${path}`, {
			...init,
			headers: {
				Authorization: this.authHeader(),
				"Content-Type": "application/json",
				...(init.headers ?? {}),
			},
			signal: AbortSignal.timeout(10_000),
		});
		const payload = (await res.json().catch(() => ({}))) as T & ListmonkError;
		if (!res.ok) {
			throw new Error(payload.message || `Listmonk HTTP ${res.status}`);
		}
		return payload;
	}

	private escapeSqlLiteral(value: string): string {
		return value.replace(/'/g, "''");
	}

	private async findSubscriber(email: string): Promise<Subscriber | null> {
		const query = `subscribers.email = '${this.escapeSqlLiteral(email)}'`;
		const page = await this.request<SubscriberPage>(
			`/api/subscribers?per_page=1&page=1&query=${encodeURIComponent(query)}`
		);
		return page.data?.results?.[0] ?? null;
	}

	private async setMembership(subscriberId: number, action: "add" | "unsubscribe"): Promise<void> {
		await this.request("/api/subscribers/lists", {
			method: "PUT",
			body: JSON.stringify({
				ids: [subscriberId],
				action,
				target_list_ids: [this.statusListId],
				status: "confirmed",
			}),
		});
	}

	upsertStatusPageSubscriber = async (input: StatusPageSubscriberInput): Promise<StatusPageSubscriberResult> => {
		if (!this.enabled()) {
			throw new Error("Listmonk is not configured");
		}

		const email = input.email.trim().toLowerCase();
		const existing = await this.findSubscriber(email);
		if (existing) {
			await this.setMembership(existing.id, "add");
			this.logger.info({
				message: "Added existing Listmonk subscriber to status list",
				service: SERVICE_NAME,
				method: "upsertStatusPageSubscriber",
				details: { subscriberId: existing.id, companyName: input.companyName },
			});
			return { personId: String(existing.id) };
		}

		const name = email.split("@")[0] || "Subscriber";
		try {
			const created = await this.request<CreateSubscriberResponse>("/api/subscribers", {
				method: "POST",
				body: JSON.stringify({
					email,
					name,
					status: "enabled",
					lists: [this.statusListId],
					preconfirm_subscriptions: true,
					attribs: { source: "status-page" },
				}),
			});
			const subscriberId = created.data?.id;
			this.logger.info({
				message: "Created Listmonk status page subscriber",
				service: SERVICE_NAME,
				method: "upsertStatusPageSubscriber",
				details: { subscriberId, companyName: input.companyName },
			});
			return { personId: subscriberId ? String(subscriberId) : undefined };
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "";
			if (!/already exists|duplicate/i.test(message)) {
				throw error;
			}
			const created = await this.findSubscriber(email);
			if (!created) {
				throw error;
			}
			await this.setMembership(created.id, "add");
			return { personId: String(created.id) };
		}
	};

	removeStatusPageSubscriber = async (input: StatusPageSubscriberInput): Promise<StatusPageSubscriberResult> => {
		if (!this.enabled()) {
			throw new Error("Listmonk is not configured");
		}

		const email = input.email.trim().toLowerCase();
		const existing = await this.findSubscriber(email);
		if (!existing) {
			return {};
		}
		await this.setMembership(existing.id, "unsubscribe");
		this.logger.info({
			message: "Unsubscribed Listmonk status page subscriber",
			service: SERVICE_NAME,
			method: "removeStatusPageSubscriber",
			details: { subscriberId: existing.id, companyName: input.companyName },
		});
		return { personId: String(existing.id) };
	};
}
