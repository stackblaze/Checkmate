import type { IMonitorService } from "@/domain/monitors/monitor.service.js";
import type { IIncidentService } from "@/domain/incidents/incident.service.js";
import type { ITagsService } from "@/domain/tags/tag.service.js";
import type { IChecksRepository } from "@/domain/checks/check.repository.interface.js";
import type { Monitor } from "@/domain/monitors/monitor.type.js";
import type { Check } from "@/domain/checks/check.type.js";
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
	checksRepository: IChecksRepository;
};

const TYPE_ALIASES: Record<string, string> = {
	infrastructure: "hardware",
	infra: "hardware",
	host: "hardware",
	hosts: "hardware",
	node: "hardware",
	nodes: "hardware",
};

const TOOLS = [
	{
		name: "list_monitors",
		description:
			'List Checkmate monitors, healthy or unhealthy. Hardware monitors include live cpu_pct, memory_pct, disk_pct (hottest disk) and disks[] from the latest check — use this when asked for usage of up/healthy hosts, not only breaches. In the Checkmate UI, "Infrastructure" monitors are type=hardware (VMware ESXi hosts, Kamaji nodes, k3s VMs). Product website/API uptime (Cal, Plane, CRM, Dashboard, Marketing Site, LibreDesk) is type=http tagged platform — that is NOT Infrastructure. For hosts/nodes pass type=hardware (aliases: infrastructure, infra). For app uptime pass tag=platform or type=http.',
		inputSchema: {
			type: "object",
			properties: {
				status: { type: "string", description: "up | down | breached | paused | initializing | maintenance" },
				type: {
					type: "string",
					description: "http | hardware | port | ping | …  Also accepts infrastructure/infra as aliases for hardware.",
				},
				tag: {
					type: "string",
					description:
						"Tag name. Hardware: kamaji, vmware, k3s, leaseweb, tenant, us-east-1, us-west-1, us-central-1, sfo. HTTP apps: platform.",
				},
				search: { type: "string", description: "Case-insensitive name/url substring" },
			},
		},
	},
	{
		name: "get_monitor",
		description:
			"Get one monitor by id or exact name. Hardware monitors include live cpu_pct, memory_pct, disk_pct (hottest disk) and per-disk usage from the latest check. Secrets are never returned.",
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
		description:
			"Monitors that are down or threshold-breached. Hardware monitors include live cpu_pct, memory_pct, disk_pct (hottest filesystem/datastore) and a disks[] breakdown from the latest check — not just alert thresholds.",
		inputSchema: { type: "object", properties: {} },
	},
	{
		name: "get_summary",
		description:
			"Counts of monitors by status and type. hardware = Checkmate Infrastructure (hosts/nodes). http = website/API uptime. platform-tagged HTTP monitors are product apps, not hosts.",
		inputSchema: { type: "object", properties: {} },
	},
	{
		name: "list_tags",
		description:
			"List Checkmate tags. platform = product HTTP apps. kamaji/vmware/k3s/leaseweb/tenant + region tags = infrastructure hardware.",
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

const summarize = (m: Monitor, tagNames?: Map<string, string>) => ({
	id: m.id,
	name: m.name,
	type: m.type,
	status: m.status,
	url: m.url,
	isActive: m.isActive,
	tags: (m.tags || []).map((id) => tagNames?.get(id) || id),
	interval: m.interval,
	cpuAlertThreshold: m.cpuAlertThreshold,
	memoryAlertThreshold: m.memoryAlertThreshold,
	diskAlertThreshold: m.diskAlertThreshold,
	tempAlertThreshold: m.tempAlertThreshold,
	diskAlertCounter: m.diskAlertCounter,
});

const loadTagNames = async (teamId: string, svc: McpServices) => {
	const tags = await svc.tagsService.getTagsByTeamId(teamId);
	return new Map(tags.map((t) => [t.id, t.name]));
};

const toPct = (v?: number | null) => {
	if (v == null || Number.isNaN(v)) {
		return null;
	}
	return Math.round((v <= 1.5 ? v * 100 : v) * 10) / 10;
};

const toGiB = (bytes?: number | null) => {
	if (bytes == null || bytes <= 0) {
		return null;
	}
	return Math.round((bytes / 1024 ** 3) * 10) / 10;
};

const liveFromCheck = (c: Check) => {
	const disks = (c.disk || []).map((d) => ({
		name: d.mountpoint || d.device || "disk",
		used_pct: toPct(d.usage_percent),
		total_gib: toGiB(d.total_bytes),
		free_gib: toGiB(d.free_bytes),
	}));
	const diskPcts = disks.map((d) => d.used_pct).filter((n): n is number => n != null);
	return {
		cpu_pct: toPct(c.cpu?.usage_percent),
		memory_pct: toPct(c.memory?.usage_percent),
		memory_used_gib: toGiB(c.memory?.used_bytes),
		memory_total_gib: toGiB(c.memory?.total_bytes),
		disk_pct: diskPcts.length ? Math.max(...diskPcts) : null,
		disks,
		checked_at: c.createdAt,
	};
};

const withLiveMetrics = async (monitors: Monitor[], tagNames: Map<string, string>, svc: McpServices) => {
	const rows = monitors.map((m) => summarize(m, tagNames));
	const hwIds = monitors.filter((m) => m.type === "hardware").map((m) => m.id);
	if (!hwIds.length) {
		return rows;
	}
	const latest = await svc.checksRepository.findLatestByMonitorIds(hwIds, { limitPerMonitor: 1 });
	return rows.map((row) => {
		const check = latest[row.id]?.[0];
		if (!check) {
			return row;
		}
		return { ...row, live: liveFromCheck(check) };
	});
};

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
		const tagNames = await loadTagNames(teamId, svc);
		const status = typeof args.status === "string" ? args.status : "";
		let type = typeof args.type === "string" ? args.type.toLowerCase() : "";
		type = TYPE_ALIASES[type] || type;
		const search = typeof args.search === "string" ? args.search.toLowerCase() : "";
		const tagName = typeof args.tag === "string" ? args.tag.toLowerCase() : "";
		const searchMeansHardware = search === "infrastructure" || search === "infra" || search === "infrastructure monitors";
		if (!type && searchMeansHardware) {
			type = "hardware";
		}
		if (status) {
			monitors = monitors.filter((m) => m.status === status);
		}
		if (type) {
			monitors = monitors.filter((m) => m.type === type);
		}
		if (search && !searchMeansHardware) {
			monitors = monitors.filter((m) => m.name.toLowerCase().includes(search) || (m.url || "").toLowerCase().includes(search));
		}
		if (tagName) {
			const tag = [...tagNames.entries()].find(([, n]) => n.toLowerCase() === tagName);
			if (!tag) {
				return { count: 0, monitors: [], note: `No tag named ${tagName}` };
			}
			monitors = monitors.filter((m) => (m.tags || []).includes(tag[0]));
		}
	return { count: monitors.length, monitors: await withLiveMetrics(monitors, tagNames, svc) };
	}

	if (name === "get_monitor") {
		const tagNames = await loadTagNames(teamId, svc);
		const m = await resolveMonitor(teamId, svc, args.id as string | undefined, args.name as string | undefined);
		const [row] = await withLiveMetrics([m], tagNames, svc);
		return row;
	}

	if (name === "list_unhealthy") {
		const tagNames = await loadTagNames(teamId, svc);
		const monitors = (await allMonitors(teamId, svc)).filter((m) => m.status === "down" || m.status === "breached");
		return { count: monitors.length, monitors: await withLiveMetrics(monitors, tagNames, svc) };
	}

	if (name === "get_summary") {
		const monitors = await allMonitors(teamId, svc);
		const byStatus: Record<string, number> = {};
		const byType: Record<string, number> = {};
		for (const m of monitors) {
			byStatus[m.status] = (byStatus[m.status] || 0) + 1;
			byType[m.type] = (byType[m.type] || 0) + 1;
		}
		return {
			total: monitors.length,
			byStatus,
			byType,
			note: "hardware = Checkmate Infrastructure (hosts/nodes). http = website/API uptime. tag platform = product apps, not hosts.",
		};
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
