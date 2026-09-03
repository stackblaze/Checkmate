import type { CheckDiskInfo } from "@/domain/checks/check.type.js";

export const DISK_INDEX_PREFIX = "index:";

/** Stable identifier for a disk entry (device, mountpoint, or index fallback). */
export const getDiskIdentifier = (disk: CheckDiskInfo, index: number): string => {
	if (disk.device?.trim()) {
		return disk.device.trim();
	}
	if (disk.mountpoint?.trim()) {
		return disk.mountpoint.trim();
	}
	return `${DISK_INDEX_PREFIX}${index}`;
};

const normalize = (value: string): string => value.trim().toLowerCase();

/** Whether a disk should be excluded from disk threshold alerts. */
export const isDiskIgnored = (disk: CheckDiskInfo, index: number, ignoredDisks: string[] | undefined): boolean => {
	if (!ignoredDisks?.length) {
		return false;
	}

	const device = disk.device?.trim().toLowerCase() ?? "";
	const mountpoint = disk.mountpoint?.trim().toLowerCase() ?? "";
	const identifier = getDiskIdentifier(disk, index).toLowerCase();
	const indexKey = `${DISK_INDEX_PREFIX}${index}`;

	for (const raw of ignoredDisks) {
		const ignored = normalize(raw);
		if (!ignored) {
			continue;
		}

		if (ignored === String(index) || ignored === indexKey) {
			return true;
		}
		if (ignored === identifier) {
			return true;
		}
		if (device && (device === ignored || device.includes(ignored) || ignored.includes(device))) {
			return true;
		}
		if (mountpoint && (mountpoint === ignored || mountpoint.includes(ignored) || ignored.includes(mountpoint))) {
			return true;
		}
	}

	return false;
};

/** Returns disks that participate in disk threshold evaluation. */
export const filterDisksForAlerts = (
	disks: CheckDiskInfo[] | undefined,
	ignoredDisks: string[] | undefined
): CheckDiskInfo[] => {
	if (!disks?.length) {
		return [];
	}
	if (!ignoredDisks?.length) {
		return disks.filter((disk): disk is CheckDiskInfo => disk != null);
	}
	return disks.filter((disk, index): disk is CheckDiskInfo => disk != null && !isDiskIgnored(disk, index, ignoredDisks));
};
