import type { CheckDiskInfo } from "@/Types/Check";

export const DISK_INDEX_PREFIX = "index:";

export const getDiskIdentifier = (disk: CheckDiskInfo, index: number): string => {
	if (disk.device?.trim()) {
		return disk.device.trim();
	}
	if (disk.mountpoint?.trim()) {
		return disk.mountpoint.trim();
	}
	return `${DISK_INDEX_PREFIX}${index}`;
};
