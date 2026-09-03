import { useMemo } from "react";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { FormMultiSelectField } from "@/Components/inputs/forms/FormMultiSelectField";
import type { CheckDiskInfo } from "@/Types/Check";
import { getDiskIdentifier } from "@/Utils/diskAlert";
import type { MonitorFormData } from "@/Validation/monitor";

interface IgnoredDisksFieldProps {
	disks?: CheckDiskInfo[];
}

export const IgnoredDisksField = ({ disks }: IgnoredDisksFieldProps) => {
	const { t } = useTranslation();

	const options = useMemo(
		() =>
			(disks ?? []).map((disk, index) => {
				const id = getDiskIdentifier(disk, index);
				const usage = disk.usage_percent != null ? `${Math.round(disk.usage_percent * 100)}%` : "—";
				const device = disk.device || t("pages.createMonitor.form.ignoredDisks.unknownDevice");
				const mountpoint = disk.mountpoint ? ` · ${disk.mountpoint}` : "";
				return {
					id,
					name: t("pages.createMonitor.form.ignoredDisks.option", {
						index,
						device,
						mountpoint,
						usage,
					}),
				};
			}),
		[disks, t]
	);

	if (!options.length) {
		return (
			<Typography variant="body2" color="text.secondary">
				{t("pages.createMonitor.form.ignoredDisks.empty")}
			</Typography>
		);
	}

	return (
		<FormMultiSelectField<MonitorFormData, (typeof options)[number]>
			name="ignoredDisks"
			fieldLabel={t("pages.createMonitor.form.ignoredDisks.label")}
			placeholder={t("pages.createMonitor.form.ignoredDisks.placeholder")}
			description={t("pages.createMonitor.form.ignoredDisks.description")}
			options={options}
			renderRow={(option) => <Typography flexGrow={1}>{option.name}</Typography>}
		/>
	);
};
