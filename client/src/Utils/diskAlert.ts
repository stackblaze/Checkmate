import type { CheckDiskInfo } from "@/Types/Check";

export const DISK_INDEX_PREFIX = "index:";

/** Stable id stored when picking a disk from the ignore list (index-based). */
export const getIgnoredDiskStorageId = (index: number): string => `${DISK_INDEX_PREFIX}${index}`;

export const getDiskIdentifier = (disk: CheckDiskInfo, index: number): string => {
	if (disk.device?.trim()) {
		return disk.device.trim();
	}
	if (disk.mountpoint?.trim()) {
		return disk.mountpoint.trim();
	}
	return getIgnoredDiskStorageId(index);
};

const normalize = (value: string): string => value.trim().toLowerCase();

export const isDiskIgnored = (disk: CheckDiskInfo, index: number, ignoredDisks: string[] | undefined): boolean => {
	if (!ignoredDisks?.length) {
		return false;
	}

	const device = disk.device?.trim().toLowerCase() ?? "";
	const mountpoint = disk.mountpoint?.trim().toLowerCase() ?? "";
	const identifier = getDiskIdentifier(disk, index).toLowerCase();
	const indexKey = getIgnoredDiskStorageId(index);

	for (const raw of ignoredDisks) {
		const ignored = normalize(raw);
		if (!ignored) {
			continue;
		}

		if (ignored === String(index) || ignored === indexKey.toLowerCase()) {
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
