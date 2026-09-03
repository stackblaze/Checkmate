import type { CheckDiskInfo } from "@/domain/checks/check.type.js";
import type { CheckSnapshot } from "@/domain/checks/check.type.js";
import type { HardwareStatusMetrics } from "@/types/network.js";
import { filterDisksForAlerts } from "@/domain/monitors/disk-alert.utils.js";

export type HardwareBreaches = {
	cpu: boolean;
	memory: boolean;
	disk: boolean;
	temp: boolean;
};

export const evaluateHardwareBreaches = (params: {
	metrics: HardwareStatusMetrics;
	thresholds: { cpu: number; memory: number; disk: number; temp: number };
	ignoredDisks?: string[];
}): HardwareBreaches => {
	const { metrics, thresholds, ignoredDisks } = params;
	const cpuUsage = metrics.cpu?.usage_percent ?? -1;
	const memoryUsage = metrics.memory?.usage_percent ?? -1;
	const temps = metrics.cpu?.temperature ?? [];
	const disksForAlerts = filterDisksForAlerts(metrics.disk, ignoredDisks);

	return {
		cpu: cpuUsage !== -1 && cpuUsage > thresholds.cpu / 100,
		memory: memoryUsage !== -1 && memoryUsage > thresholds.memory / 100,
		disk: disksForAlerts.some(
			(d) => d != null && typeof d.usage_percent === "number" && d.usage_percent > thresholds.disk / 100
		),
		temp: temps.some((temp: number) => temp > thresholds.temp),
	};
};

export const metricsFromCheckSnapshot = (snapshot: CheckSnapshot): HardwareStatusMetrics => ({
	cpu: snapshot.cpu,
	memory: snapshot.memory,
	disk: snapshot.disk as CheckDiskInfo[] | undefined,
	host: snapshot.host ?? {},
});

export const allHardwareBreachesClear = (breaches: HardwareBreaches): boolean =>
	!breaches.cpu && !breaches.memory && !breaches.disk && !breaches.temp;
