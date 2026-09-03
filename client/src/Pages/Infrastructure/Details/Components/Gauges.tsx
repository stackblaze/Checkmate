import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import { DetailGauge } from "@/Components/design-elements";
import { BellOff } from "lucide-react";

import prettyBytes from "pretty-bytes";
import { useTranslation } from "react-i18next";
import { getFrequency } from "@/Utils/InfraUtils";
import { useTheme } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { CheckSnapshot } from "@/Types/Check";
import type { Monitor } from "@/Types/Monitor";
import { isDiskIgnored } from "@/Utils/diskAlert";

const GAUGE_MAX_WIDTH = 260;

export const InfraDetailsGauges = ({
	snapshot,
	monitor,
}: {
	snapshot: CheckSnapshot | undefined;
	monitor?: Monitor;
}) => {
	const { t } = useTranslation();
	const theme = useTheme();
	const isSmall = useMediaQuery(theme.breakpoints.down("md"));
	const ignoredDisks = monitor?.ignoredDisks ?? [];
	const diskThreshold = monitor?.diskAlertThreshold ?? 80;

	if (!snapshot) {
		return null;
	}

	const suppressedIcon = (
		<Tooltip title={t("pages.infrastructure.gauges.disk.alertsSuppressed")}>
			<IconButton
				size="small"
				aria-label={t("pages.infrastructure.gauges.disk.alertsSuppressed")}
				sx={{ color: theme.palette.text.secondary, mt: -0.5 }}
			>
				<BellOff size={16} />
			</IconButton>
		</Tooltip>
	);

	return (
		<Stack
			direction={isSmall ? "column" : "row"}
			spacing={theme.spacing(8)}
			alignItems={"stretch"}
			flexWrap={"wrap"}
			useFlexGap
		>
			<DetailGauge
				title={t("pages.infrastructure.gauges.memory.title")}
				maxWidth={GAUGE_MAX_WIDTH}
				progress={(snapshot?.memory?.usage_percent || 0) * 100}
				upperLabel={t("pages.infrastructure.gauges.memory.upperLabel")}
				upperValue={prettyBytes(snapshot?.memory?.used_bytes || 0)}
				lowerLabel={t("pages.infrastructure.gauges.memory.lowerLabel")}
				lowerValue={prettyBytes(snapshot?.memory?.total_bytes || 0)}
				flexBasis={isSmall ? "auto" : GAUGE_MAX_WIDTH}
			/>
			<DetailGauge
				title={t("pages.infrastructure.gauges.cpu.title")}
				maxWidth={GAUGE_MAX_WIDTH}
				progress={(snapshot?.cpu?.usage_percent || 0) * 100}
				upperLabel={t("pages.infrastructure.gauges.cpu.upperLabel")}
				upperValue={getFrequency(snapshot?.cpu?.current_frequency || 0)}
				lowerLabel={t("pages.infrastructure.gauges.cpu.lowerLabel")}
				lowerValue={getFrequency(snapshot?.cpu?.frequency || 0)}
				flexBasis={isSmall ? "auto" : GAUGE_MAX_WIDTH}
			/>
			{snapshot?.disk?.map((disk, idx) => {
				const alertsSuppressed = isDiskIgnored(disk, idx, ignoredDisks);
				const usagePercent = (disk.usage_percent || 0) * 100;
				const wouldBreach = usagePercent > diskThreshold;
				const strokeColor =
					alertsSuppressed && wouldBreach ? theme.palette.text.disabled : undefined;

				return (
					<DetailGauge
						key={disk?.device || `disk-${idx}`}
						title={t("pages.infrastructure.gauges.disk.title", { idx })}
						titleAdornment={alertsSuppressed ? suppressedIcon : undefined}
						maxWidth={GAUGE_MAX_WIDTH}
						progress={usagePercent}
						strokeColor={strokeColor}
						upperLabel={t("pages.infrastructure.gauges.disk.upperLabel")}
						upperValue={prettyBytes(disk?.used_bytes || 0)}
						lowerLabel={t("pages.infrastructure.gauges.disk.lowerLabel")}
						lowerValue={prettyBytes(disk?.total_bytes || 0)}
						flexBasis={isSmall ? "auto" : GAUGE_MAX_WIDTH}
					/>
				);
			})}
		</Stack>
	);
};
