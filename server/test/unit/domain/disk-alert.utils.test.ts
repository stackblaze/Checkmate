import { describe, expect, it } from "@jest/globals";
import { filterDisksForAlerts, getDiskIdentifier, isDiskIgnored } from "../../../src/domain/monitors/disk-alert.utils.ts";

describe("disk-alert.utils", () => {
	describe("getDiskIdentifier", () => {
		it("prefers device over mountpoint", () => {
			expect(getDiskIdentifier({ device: "/dev/sdb", mountpoint: "/mnt/isos" }, 2)).toBe("/dev/sdb");
		});

		it("falls back to mountpoint then index", () => {
			expect(getDiskIdentifier({ mountpoint: "/mnt/isos" }, 2)).toBe("/mnt/isos");
			expect(getDiskIdentifier({}, 2)).toBe("index:2");
		});
	});

	describe("isDiskIgnored", () => {
		const disk = { device: "/dev/sdb", mountpoint: "/mnt/isos", usage_percent: 0.9 };

		it("matches by device", () => {
			expect(isDiskIgnored(disk, 2, ["/dev/sdb"])).toBe(true);
		});

		it("matches by mountpoint", () => {
			expect(isDiskIgnored(disk, 2, ["/mnt/isos"])).toBe(true);
		});

		it("matches by disk index", () => {
			expect(isDiskIgnored(disk, 2, ["2"])).toBe(true);
			expect(isDiskIgnored(disk, 2, ["index:2"])).toBe(true);
		});

		it("returns false when ignored list is empty", () => {
			expect(isDiskIgnored(disk, 2, [])).toBe(false);
		});
	});

	describe("filterDisksForAlerts", () => {
		it("excludes ignored disks from alert evaluation", () => {
			const disks = [
				{ device: "/dev/sda", usage_percent: 0.2 },
				{ device: "/dev/sdb", usage_percent: 0.9 },
			];
			expect(filterDisksForAlerts(disks, ["/dev/sdb"])).toEqual([{ device: "/dev/sda", usage_percent: 0.2 }]);
		});
	});
});
