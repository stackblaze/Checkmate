import type { IMonitorService } from "@/domain/monitors/monitor.service.js";
import type { IIncidentService } from "@/domain/incidents/incident.service.js";
import type { ITagsService } from "@/domain/tags/tag.service.js";
import type { Monitor } from "@/domain/monitors/monitor.type.js";
import type { User } from "@/domain/users/user.type.js";
import type { DateRange } from "@/types/query.js";

const DATE_RANGES: readonly DateRange[] = ["recent", "hour", "day", "week", "month", "all"];
const isDateRange = (v: unknown): v is DateRange => typeof v === "string" && (DATE_RANGES as readonly string[]).includes(v);

const PROTOCOL_VERSIONS = ["2025-03-26", "2024-11-05", "2025-06-18"] as const;
const SERVER_INFO = { name: "checkmate", version: "3.8.1-stackblaze" };

type JsonRpcId = string | number | null;
type JsonRpcReq = { jsonrpc?: string; id?: JsonRpcId; method?: string; params?: Record<string, unknown> };

export type McpServices = {
	monitorService: IMonitorService;
	incidentService: IIncidentService;
	tagsService: ITagsService;
};

const TOOLS = [
	{
		name: "list_monitors",
		description: "List Checkmate monitors. Filter by status (up, down, breached, paused, initializing), type, tag name, or name substring.",
		inputSchema: {
			type: "object",
			properties: {
				status: { type: "string", description: "up | down | breached | paused | initializing | maintenance" },
				type: { type: "string", description: "http | hardware | ping | port | docker | pagespeed | …" },
				tag: { type: "string", description: "Tag name (e.g. kamaji, tenant, sfo)" },
				search: { type: "string", description: "Case-insensitive name/url substring" },
			},
		},
	},
	{
		name: "get_monitor",
		description: "Get one monitor by id or exact name. Secrets are never returned.",
		inputSchema: {
			type: "object",
			properties: {
				id: { type: "string" },
				name: { type: "string" },
			},
		},
	},
	{
		name: "list_unhealthy",
		description: "Monitors that are down or threshold-breached.",
		inputSchema: { type: "object", properties: {} },
	},
	{
		name: "get_summary",
		description: "Counts of monitors by status and type.",
		inputSchema: { type: "object", properties: {} },
	},
	{
		name: "list_tags",
		description: "List Checkmate tags for this team.",
		inputSchema: { type: "object", properties: {} },
	},
	{
		name: "list_incidents",
		description: "List incidents. status=true means currently open.",
		inputSchema: {
			type: "object",
			properties: {
				open_only: { type: "boolean", description: "If true, only unresolved incidents" },
				date_range: { type: "string", description: "recent | hour | day | week | month | all (default week)" },
				limit: { type: "number", description: "Page size (default 25)" },
			},
		},
	},
	{
		name: "pause_monitor",
		description: "Pause or resume a monitor by id or exact name.",
		inputSchema: {
			type: "object",
			properties: {
				id: { type: "string" },
				name: { type: "string" },
				pause: { type: "boolean", description: "true to pause, false to resume (default true)" },
			},
		},
	},
] as const;

const summarize = (m: Monitor) => ({
	id: m.id,
	name: m.name,
	type: m.type,
	status: m.status,
	url: m.url,
	isActive: m.isActive,
	tags: m.tags,
	interval: m.interval,
	cpuAlertThreshold: m.cpuAlertThreshold,
	memoryAlertThreshold: m.memoryAlertThreshold,
	diskAlertThreshold: m.diskAlertThreshold,
	tempAlertThreshold: m.tempAlertThreshold,
	diskAlertCounter: m.diskAlertCounter,
});

const jsonResult = (id: JsonRpcId, result: unknown) => ({ jsonrpc: "2.0", id, result });
const jsonError = (id: JsonRpcId, code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

const textContent = (data: unknown) => ({
	content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }],
});

export const handleMcpRequest = async (body: JsonRpcReq, user: User, svc: McpServices) => {
	const id = (body.id ?? null) as JsonRpcId;
	const method = body.method || "";
	const params = body.params || {};
	const teamId = user.teamId;

	if (method === "initialize") {
		const requested = typeof params.protocolVersion === "string" ? params.protocolVersion : PROTOCOL_VERSIONS[0];
		const protocolVersion = (PROTOCOL_VERSIONS as readonly string[]).includes(requested) ? requested : PROTOCOL_VERSIONS[0];
		return jsonResult(id, {
			protocolVersion,
			capabilities: { tools: { listChanged: false } },
			serverInfo: SERVER_INFO,
		});
	}

	if (method === "notifications/initialized" || method === "notifications/cancelled") {
		return null;
	}

	if (method === "ping") {
		return jsonResult(id, {});
	}

	if (method === "tools/list") {
		return jsonResult(id, { tools: TOOLS });
	}

	if (method === "tools/call") {
		const name = String(params.name || "");
		const args = (params.arguments || {}) as Record<string, unknown>;
		try {
			const data = await callTool(name, args, teamId, svc);
			return jsonResult(id, textContent(data));
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			return jsonResult(id, { ...textContent({ error: message }), isError: true });
		}
	}

	return jsonError(id, -32601, `Unknown method: ${method}`);
};

const allMonitors = async (teamId: string, svc: McpServices) => {
	return (await svc.monitorService.getMonitorsByTeamId({ teamId })) ?? [];
};

const resolveMonitor = async (teamId: string, svc: McpServices, id?: string, name?: string) => {
	if (id) {
		return svc.monitorService.getMonitorById({ teamId, monitorId: id });
	}
	if (!name) {
		throw new Error("Provide id or name");
	}
	const monitors = await allMonitors(teamId, svc);
	const found = monitors.find((m) => m.name === name);
	if (!found) {
		throw new Error(`Monitor not found: ${name}`);
	}
	return found;
};

const callTool = async (name: string, args: Record<string, unknown>, teamId: string, svc: McpServices) => {
	if (name === "list_monitors") {
		let monitors = await allMonitors(teamId, svc);
		const status = typeof args.status === "string" ? args.status : "";
		const type = typeof args.type === "string" ? args.type : "";
		const search = typeof args.search === "string" ? args.search.toLowerCase() : "";
		const tagName = typeof args.tag === "string" ? args.tag.toLowerCase() : "";
		if (status) {
			monitors = monitors.filter((m) => m.status === status);
		}
		if (type) {
			monitors = monitors.filter((m) => m.type === type);
		}
		if (search) {
			monitors = monitors.filter((m) => m.name.toLowerCase().includes(search) || (m.url || "").toLowerCase().includes(search));
		}
		if (tagName) {
			const tags = await svc.tagsService.getTagsByTeamId(teamId);
			const tag = tags.find((t) => t.name.toLowerCase() === tagName);
			if (!tag) {
				return { count: 0, monitors: [], note: `No tag named ${tagName}` };
			}
			monitors = monitors.filter((m) => (m.tags || []).includes(tag.id));
		}
		return { count: monitors.length, monitors: monitors.map(summarize) };
	}

	if (name === "get_monitor") {
		const m = await resolveMonitor(teamId, svc, args.id as string | undefined, args.name as string | undefined);
		return summarize(m);
	}

	if (name === "list_unhealthy") {
		const monitors = (await allMonitors(teamId, svc)).filter((m) => m.status === "down" || m.status === "breached");
		return { count: monitors.length, monitors: monitors.map(summarize) };
	}

	if (name === "get_summary") {
		const monitors = await allMonitors(teamId, svc);
		const byStatus: Record<string, number> = {};
		const byType: Record<string, number> = {};
		for (const m of monitors) {
			byStatus[m.status] = (byStatus[m.status] || 0) + 1;
			byType[m.type] = (byType[m.type] || 0) + 1;
		}
		return { total: monitors.length, byStatus, byType };
	}

	if (name === "list_tags") {
		const tags = await svc.tagsService.getTagsByTeamId(teamId);
		return tags.map((t) => ({ id: t.id, name: t.name, color: t.color }));
	}

	if (name === "list_incidents") {
		const dateRange: DateRange = isDateRange(args.date_range) ? args.date_range : "week";
		const limit = typeof args.limit === "number" ? args.limit : 25;
		const openOnly = args.open_only === true;
		const result = await svc.incidentService.getIncidentsByTeam(
			teamId,
			"desc",
			dateRange,
			0,
			limit,
			openOnly ? true : undefined,
			undefined,
			undefined
		);
		return result;
	}

	if (name === "pause_monitor") {
		const wantPause = args.pause !== false;
		const m = await resolveMonitor(teamId, svc, args.id as string | undefined, args.name as string | undefined);
		if (wantPause === !m.isActive) {
			return { id: m.id, name: m.name, isActive: m.isActive, note: wantPause ? "already paused" : "already running" };
		}
		const updated = await svc.monitorService.pauseMonitor({ teamId, monitorId: m.id });
		return { id: updated.id, name: updated.name, isActive: updated.isActive, status: updated.status };
	}

	throw new Error(`Unknown tool: ${name}`);
};
