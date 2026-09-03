import type { HardwareCheckStats, HardwareNetStats } from "@/Types/Monitor";

const LOOPBACK_IFACE_NAMES = new Set(["lo", "lo0", "docker0"]);

const activeInterfaces = (net: HardwareNetStats[] | undefined): HardwareNetStats[] =>
	(net ?? []).filter((iface) => !LOOPBACK_IFACE_NAMES.has(iface.name));

/** Combined send + receive throughput (bytes/sec) across active interfaces. */
export const sumInterfaceThroughput = (net: HardwareNetStats[] | undefined): number =>
	activeInterfaces(net).reduce(
		(sum, iface) => sum + (iface.bytesSentPerSecond || 0) + (iface.deltaBytesRecv || 0),
		0
	);

export type HardwareCheckStatsWithBandwidth = HardwareCheckStats & {
	totalBandwidthBytesPerSecond: number;
};

export const enrichChecksWithBandwidth = (
	checks: HardwareCheckStats[]
): HardwareCheckStatsWithBandwidth[] =>
	checks.map((check) => ({
		...check,
		totalBandwidthBytesPerSecond: sumInterfaceThroughput(check.net),
	}));

const bucketDurationSeconds = (checks: HardwareCheckStats[], index: number): number => {
	if (checks.length === 1) {
		return 60;
	}
	if (index < checks.length - 1) {
		const current = Date.parse(checks[index].bucketDate);
		const next = Date.parse(checks[index + 1].bucketDate);
		if (!Number.isNaN(current) && !Number.isNaN(next) && next > current) {
			return (next - current) / 1000;
		}
	}
	const previous = Date.parse(checks[index - 1]?.bucketDate ?? "");
	const current = Date.parse(checks[index].bucketDate);
	if (!Number.isNaN(previous) && !Number.isNaN(current) && current > previous) {
		return (current - previous) / 1000;
	}
	return 60;
};

/** Estimated total bytes transferred across the selected period. */
export const computeTotalTransferredBytes = (checks: HardwareCheckStats[]): number => {
	if (!checks.length) {
		return 0;
	}
	return checks.reduce((total, check, index) => {
		const rate = sumInterfaceThroughput(check.net);
		return total + rate * bucketDurationSeconds(checks, index);
	}, 0);
};

export const hasBandwidthData = (checks: HardwareCheckStats[]): boolean =>
	checks.some((check) => sumInterfaceThroughput(check.net) > 0);
