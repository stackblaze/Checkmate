import type { CheckDiskInfo } from "@/domain/checks/check.type.js";
import type { CheckSnapshot } from "@/domain/checks/check.type.js";
import type { Monitor } from "@/domain/monitors/monitor.type.js";
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
	const rawTemps = metrics.cpu?.temperature;
	const temps = Array.isArray(rawTemps) ? rawTemps : rawTemps != null ? [rawTemps as number] : [];
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

const HARDWARE_ALERT_COUNTER_START = 5;

/** When ignored disks clear all active threshold breaches, return a status recovery patch. */
export const getHardwareRecoveryPatch = (
	monitor: Pick<
		Monitor,
		| "type"
		| "status"
		| "recentChecks"
		| "cpuAlertThreshold"
		| "memoryAlertThreshold"
		| "diskAlertThreshold"
		| "tempAlertThreshold"
		| "ignoredDisks"
	>,
	ignoredDisks: string[]
): Partial<Monitor> | null => {
	if (monitor.type !== "hardware" || monitor.status !== "breached") {
		return null;
	}

	const latestCheck = monitor.recentChecks?.at(-1);
	if (!latestCheck) {
		return null;
	}

	const breaches = evaluateHardwareBreaches({
		metrics: metricsFromCheckSnapshot(latestCheck),
		thresholds: {
			cpu: monitor.cpuAlertThreshold,
			memory: monitor.memoryAlertThreshold,
			disk: monitor.diskAlertThreshold,
			temp: monitor.tempAlertThreshold,
		},
		ignoredDisks,
	});

	if (!allHardwareBreachesClear(breaches)) {
		return null;
	}

	return {
		status: "up",
		cpuAlertCounter: HARDWARE_ALERT_COUNTER_START,
		memoryAlertCounter: HARDWARE_ALERT_COUNTER_START,
		diskAlertCounter: HARDWARE_ALERT_COUNTER_START,
		tempAlertCounter: HARDWARE_ALERT_COUNTER_START,
	};
};
