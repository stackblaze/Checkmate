import { describe, expect, it, jest } from "@jest/globals";
import { handleMcpRequest } from "../../../src/mcp/checkmateMcp.ts";
import type { User } from "../../../src/types/user.ts";
import type { Monitor } from "../../../src/types/monitor.ts";

const user: User = {
	id: "u1",
	firstName: "Dean",
	lastName: "Admin",
	email: "dean@stackblaze.com",
	password: "x",
	isActive: true,
	isVerified: true,
	role: ["superadmin"],
	teamId: "team-1",
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
};

const makeMonitor = (overrides?: Partial<Monitor>): Monitor =>
	({
		id: "m1",
		userId: "u1",
		teamId: "team-1",
		name: "k3s-sfo · Node leaseweb-vm1",
		status: "up",
		statusWindow: [],
		statusWindowSize: 5,
		statusWindowThreshold: 5,
		type: "hardware",
		ignoreTlsErrors: false,
		useAdvancedMatching: false,
		url: "http://23.81.118.150:59232/api/v1/metrics",
		isActive: true,
		interval: 60000,
		notifications: [],
		tags: ["tag-sfo"],
		cpuAlertThreshold: 80,
		cpuAlertCounter: 5,
		memoryAlertThreshold: 80,
		memoryAlertCounter: 5,
		diskAlertThreshold: 80,
		diskAlertCounter: 5,
		tempAlertThreshold: 80,
		tempAlertCounter: 5,
		selectedDisks: [],
		group: null,
		...overrides,
	}) as Monitor;

const createServices = () => {
	const monitors = [
		makeMonitor(),
		makeMonitor({ id: "m2", name: "east-tenant-a", type: "http", status: "down", url: "https://example.com", tags: [] }),
	];
	return {
		monitorService: {
			getMonitorsByTeamId: jest.fn(async () => monitors),
			getMonitorById: jest.fn(async ({ monitorId }: { monitorId: string }) => {
				const found = monitors.find((m) => m.id === monitorId);
				if (!found) {
					throw new Error("not found");
				}
				return found;
			}),
			pauseMonitor: jest.fn(async ({ monitorId }: { monitorId: string }) => {
				const found = monitors.find((m) => m.id === monitorId)!;
				found.isActive = !found.isActive;
				return found;
			}),
		},
		incidentService: {
			getIncidentsByTeam: jest.fn(async () => ({ incidents: [], count: 0 })),
		},
		tagsService: {
			getTagsByTeamId: jest.fn(async () => [{ id: "tag-sfo", teamId: "team-1", name: "sfo", color: "#000", createdAt: "", updatedAt: "" }]),
		},
	};
};

describe("handleMcpRequest", () => {
	it("initializes with a supported protocol version", async () => {
		const result = await handleMcpRequest({ method: "initialize", id: 1, params: { protocolVersion: "2025-03-26" } }, user, createServices() as any);
		expect(result).toMatchObject({
			jsonrpc: "2.0",
			id: 1,
			result: {
				protocolVersion: "2025-03-26",
				serverInfo: { name: "checkmate" },
			},
		});
	});

	it("lists tools", async () => {
		const result = await handleMcpRequest({ method: "tools/list", id: 2 }, user, createServices() as any);
		expect(result?.result.tools.map((t: { name: string }) => t.name)).toEqual([
			"list_monitors",
			"get_monitor",
			"list_unhealthy",
			"get_summary",
			"list_tags",
			"list_incidents",
			"pause_monitor",
		]);
	});

	it("returns unhealthy monitors without secrets", async () => {
		const result = await handleMcpRequest({ method: "tools/call", id: 3, params: { name: "list_unhealthy" } }, user, createServices() as any);
		const parsed = JSON.parse(result?.result.content[0].text);
		expect(parsed.count).toBe(1);
		expect(parsed.monitors[0].name).toBe("east-tenant-a");
		expect(parsed.monitors[0].secret).toBeUndefined();
	});

	it("filters monitors by tag name", async () => {
		const result = await handleMcpRequest(
			{ method: "tools/call", id: 4, params: { name: "list_monitors", arguments: { tag: "sfo" } } },
			user,
			createServices() as any
		);
		const parsed = JSON.parse(result?.result.content[0].text);
		expect(parsed.count).toBe(1);
		expect(parsed.monitors[0].id).toBe("m1");
	});

	it("does not toggle pause when already in the requested state", async () => {
		const svc = createServices();
		const result = await handleMcpRequest(
			{ method: "tools/call", id: 5, params: { name: "pause_monitor", arguments: { id: "m1", pause: false } } },
			user,
			svc as any
		);
		const parsed = JSON.parse(result?.result.content[0].text);
		expect(parsed.note).toBe("already running");
		expect(svc.monitorService.pauseMonitor).not.toHaveBeenCalled();
	});

	it("returns 202-style null for initialized notifications", async () => {
		const result = await handleMcpRequest({ method: "notifications/initialized" }, user, createServices() as any);
		expect(result).toBeNull();
	});
});
