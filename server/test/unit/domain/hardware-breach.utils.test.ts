import { describe, expect, it } from "@jest/globals";
import {
	allHardwareBreachesClear,
	evaluateHardwareBreaches,
	metricsFromCheckSnapshot,
} from "../../../src/domain/monitors/hardware-breach.utils.ts";

describe("hardware-breach.utils", () => {
	it("ignores disks when evaluating breaches", () => {
		const breaches = evaluateHardwareBreaches({
			metrics: {
				cpu: { usage_percent: 0.1 },
				memory: { usage_percent: 0.1 },
				disk: [
					{ device: "/dev/sda", usage_percent: 0.2 },
					{ device: "/dev/sdb", usage_percent: 0.9 },
				],
				host: {},
			},
			thresholds: { cpu: 80, memory: 80, disk: 80, temp: 80 },
			ignoredDisks: ["index:1"],
		});

		expect(breaches.disk).toBe(false);
		expect(allHardwareBreachesClear(breaches)).toBe(true);
	});

	it("builds metrics from check snapshots", () => {
		const metrics = metricsFromCheckSnapshot({
			id: "check-1",
			status: true,
			responseTime: 1,
			createdAt: "2026-01-01T00:00:00Z",
			disk: [{ device: "/dev/sda", usage_percent: 0.5 }],
		});

		expect(metrics.disk?.[0]?.device).toBe("/dev/sda");
	});
});
