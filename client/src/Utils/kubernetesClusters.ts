import type { Monitor, MonitorStatus } from "@/Types/Monitor";
import type { Tag } from "@/Types/Tag";

export const REGION_ORDER = [
	"us-east-1",
	"us-central-1",
	"us-west-1",
	"sfo",
	"montreal",
	"other",
] as const;

export type KubernetesRegion = (typeof REGION_ORDER)[number];
export type ClusterKind = "management" | "tenant" | "standalone";
export type MonitorRole = "control-plane" | "node" | "deployment" | "other";

export interface ClusterMember {
	id: string;
	monitor: Monitor;
	role: MonitorRole;
	label: string;
}

export interface KubernetesCluster {
	id: string;
	name: string;
	region: KubernetesRegion;
	kind: ClusterKind;
	parentName?: string;
	status: MonitorStatus;
	members: ClusterMember[];
	controlPlane: ClusterMember[];
	nodes: ClusterMember[];
	deployments: ClusterMember[];
	tenants: KubernetesCluster[];
}

export interface RegionGroup {
	region: KubernetesRegion;
	clusters: KubernetesCluster[];
}

const NAME_SEP = " · ";
const K8S_NAME = /^(kamaji-|k3s-)/i;
const K8S_ROLE = /Control Plane|Tenant |Node |Deployment /i;
const K8S_URL = /healthz\.|\/tenant\/|\/capture\/node|\/component\//i;
const K8S_TAGS = new Set(["kamaji", "k3s", "tenant", "kubernetes"]);

const REGION_FROM_NAME: { test: RegExp; region: KubernetesRegion }[] = [
	{ test: /us-central-1|central-1/i, region: "us-central-1" },
	{ test: /us-west-1|west-1/i, region: "us-west-1" },
	{ test: /us-east-1|east-1/i, region: "us-east-1" },
	{ test: /\bsfo\b/i, region: "sfo" },
	{ test: /montreal/i, region: "montreal" },
];

export const regionFromName = (name: string): KubernetesRegion => {
	for (const { test, region } of REGION_FROM_NAME) {
		if (test.test(name)) return region;
	}
	return "other";
};

export const isKubernetesMonitor = (monitor: Monitor, tags: Tag[] = []): boolean => {
	const name = monitor.name || "";
	const url = monitor.url || "";
	if (K8S_NAME.test(name)) return true;
	if (name.includes(NAME_SEP) && K8S_ROLE.test(name)) return true;
	if (K8S_URL.test(url)) return true;
	if (/\/cluster$/i.test(url) && /healthz|kamaji|k8s/i.test(url)) return true;
	const tagById = new Map(tags.map((tag) => [tag.id, tag.name]));
	return (monitor.tags || []).some((id) => K8S_TAGS.has((tagById.get(id) || "").toLowerCase()));
};

const parseMember = (
	monitor: Monitor
): { clusterName: string; role: MonitorRole; label: string; parentName?: string } | null => {
	const name = monitor.name || "";
	const sep = name.indexOf(NAME_SEP);
	if (sep !== -1) {
		const prefix = name.slice(0, sep).trim();
		const rest = name.slice(sep + NAME_SEP.length).trim();
		if (/^Control Plane$/i.test(rest)) {
			return { clusterName: prefix, role: "control-plane", label: rest };
		}
		const node = rest.match(/^Node\s+(.+)$/i);
		if (node) {
			return { clusterName: prefix, role: "node", label: node[1] };
		}
		const tenant = rest.match(/^Tenant\s+(.+)$/i);
		if (tenant) {
			return {
				clusterName: tenant[1],
				role: "control-plane",
				label: "Control Plane",
				parentName: prefix,
			};
		}
		const deployment = rest.match(/^Deployment\s+(.+)$/i);
		if (deployment) {
			return { clusterName: prefix, role: "deployment", label: deployment[1] };
		}
		if (K8S_NAME.test(prefix)) {
			return { clusterName: prefix, role: "deployment", label: rest };
		}
	}

	const tenantUrl = monitor.url?.match(/\/tenant\/([^/?#]+)(?:\/(.*))?$/i);
	if (tenantUrl) {
		const tenant = decodeURIComponent(tenantUrl[1]);
		const restPath = tenantUrl[2] || "";
		if (!restPath) {
			return {
				clusterName: tenant,
				role: "control-plane",
				label: name || "Control Plane",
			};
		}
		const node = restPath.match(/^(?:capture\/)?node\/(.+)$/i);
		if (node) {
			return { clusterName: tenant, role: "node", label: node[1] };
		}
		const deployment = restPath.match(/^deployment\/(.+)$/i);
		if (deployment) {
			return { clusterName: tenant, role: "deployment", label: deployment[1] };
		}
	}
	if (/\/cluster$/i.test(monitor.url || "") && /healthz|kamaji|k8s/i.test(monitor.url || "")) {
		return { clusterName: name || "unknown", role: "control-plane", label: "Control Plane" };
	}
	if (K8S_NAME.test(name)) {
		return { clusterName: name, role: "other", label: name };
	}
	return null;
};

const clusterKind = (name: string, fromTenant: boolean): ClusterKind => {
	if (fromTenant) return "tenant";
	if (/^kamaji-/i.test(name)) return "management";
	return "standalone";
};

const STATUS_RANK: Record<MonitorStatus, number> = {
	down: 0,
	breached: 1,
	maintenance: 2,
	initializing: 3,
	paused: 4,
	up: 5,
};

export const rollupStatus = (monitors: Monitor[]): MonitorStatus => {
	if (monitors.length === 0) return "initializing";
	const inactive = (m: Monitor) => m.isActive === false || m.status === "paused";
	if (monitors.every(inactive)) return "paused";
	const active = monitors.filter((m) => !inactive(m));
	return active.reduce<MonitorStatus>((worst, m) => {
		return STATUS_RANK[m.status] < STATUS_RANK[worst] ? m.status : worst;
	}, "up");
};

export const countHealthy = (members: ClusterMember[]): { up: number; total: number } => {
	const counted = members.filter(
		(m) => m.monitor.isActive !== false && m.monitor.status !== "paused"
	);
	return {
		up: counted.filter((m) => m.monitor.status === "up").length,
		total: counted.length,
	};
};

export const groupKubernetesClusters = (
	monitors: Monitor[],
	tags: Tag[] = []
): KubernetesCluster[] => {
	const byId = new Map<string, KubernetesCluster>();

	for (const monitor of monitors) {
		if (!isKubernetesMonitor(monitor, tags)) continue;
		const parsed = parseMember(monitor);
		if (!parsed) continue;

		const existing = byId.get(parsed.clusterName);
		const member: ClusterMember = {
			id: monitor.id,
			monitor,
			role: parsed.role,
			label: parsed.label,
		};
		if (existing) {
			existing.members.push(member);
			if (parsed.parentName && !existing.parentName) {
				existing.parentName = parsed.parentName;
			}
			if (parsed.parentName) existing.kind = "tenant";
			continue;
		}
		byId.set(parsed.clusterName, {
			id: parsed.clusterName,
			name: parsed.clusterName,
			region: regionFromName(parsed.clusterName),
			kind: clusterKind(parsed.clusterName, Boolean(parsed.parentName)),
			parentName: parsed.parentName,
			status: "initializing",
			members: [member],
			controlPlane: [],
			nodes: [],
			deployments: [],
			tenants: [],
		});
	}

	const list = [...byId.values()]
		.map((cluster) => {
			const controlPlane = cluster.members.filter((m) => m.role === "control-plane");
			const nodes = cluster.members.filter((m) => m.role === "node");
			const deployments = cluster.members.filter((m) => m.role === "deployment");
			return {
				...cluster,
				controlPlane,
				nodes,
				deployments,
				status: rollupStatus(cluster.members.map((m) => m.monitor)),
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name));

	const byName = new Map(list.map((cluster) => [cluster.name, cluster]));
	for (const cluster of list) {
		if (cluster.kind !== "tenant" || !cluster.parentName) continue;
		byName.get(cluster.parentName)?.tenants.push(cluster);
	}
	for (const cluster of list) {
		cluster.tenants.sort((a, b) => a.name.localeCompare(b.name));
	}
	return list;
};

export const isListCluster = (cluster: KubernetesCluster): boolean =>
	cluster.kind !== "tenant" || !cluster.parentName;

export const groupClustersByRegion = (clusters: KubernetesCluster[]): RegionGroup[] => {
	const byRegion = new Map<KubernetesRegion, KubernetesCluster[]>();
	for (const cluster of clusters) {
		const list = byRegion.get(cluster.region) ?? [];
		list.push(cluster);
		byRegion.set(cluster.region, list);
	}
	return REGION_ORDER.filter((region) => byRegion.has(region)).map((region) => ({
		region,
		clusters: byRegion.get(region) ?? [],
	}));
};

export const clusterKindLabelKey = (kind: ClusterKind): string => {
	if (kind === "management") return "pages.kubernetes.kind.management";
	if (kind === "tenant") return "pages.kubernetes.kind.tenant";
	return "pages.kubernetes.kind.standalone";
};

export interface StatusCounts {
	total: number;
	up: number;
	down: number;
	breached: number;
	paused: number;
	initializing: number;
}

export const statusCounts = (statuses: MonitorStatus[]): StatusCounts => ({
	total: statuses.length,
	up: statuses.filter((s) => s === "up").length,
	down: statuses.filter((s) => s === "down").length,
	breached: statuses.filter((s) => s === "breached").length,
	paused: statuses.filter((s) => s === "paused").length,
	initializing: statuses.filter((s) => s === "initializing").length,
});

export const clusterSummary = (clusters: KubernetesCluster[]): StatusCounts =>
	statusCounts(clusters.map((c) => c.status));

export const memberSummary = (members: ClusterMember[]): StatusCounts =>
	statusCounts(
		members.map((m) =>
			m.monitor.isActive === false || m.monitor.status === "paused"
				? "paused"
				: m.monitor.status
		)
	);
