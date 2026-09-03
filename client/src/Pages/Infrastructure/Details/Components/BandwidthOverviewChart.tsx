import Grid from "@mui/material/Grid";
import { HistogramInfrastructure } from "@/Components/monitors";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import type { HardwareCheckStats } from "@/Types/Monitor";
import { enrichChecksWithBandwidth, hasBandwidthData } from "@/Utils/bandwidthUtils";

const formatBytesPerSecond = (value: number) => {
	if (value >= 1024 ** 3) {
		return `${(value / 1024 ** 3).toFixed(2)} GB/s`;
	}
	if (value >= 1024 ** 2) {
		return `${(value / 1024 ** 2).toFixed(2)} MB/s`;
	}
	if (value >= 1024) {
		return `${(value / 1024).toFixed(2)} KB/s`;
	}
	return `${value.toFixed(0)} B/s`;
};

export const BandwidthOverviewChart = ({
	checks,
	dateRange,
}: {
	checks: HardwareCheckStats[];
	dateRange: string;
}) => {
	const theme = useTheme();
	const isSmall = useMediaQuery(theme.breakpoints.down("md"));
	const { t } = useTranslation();
	const enrichedChecks = useMemo(() => enrichChecksWithBandwidth(checks), [checks]);

	if (!hasBandwidthData(checks)) {
		return null;
	}

	return (
		<Grid container spacing={theme.spacing(8)}>
			<Grid size={isSmall ? 12 : 12}>
				<HistogramInfrastructure
					dateRange={dateRange}
					title={t("pages.infrastructure.charts.labels.totalBandwidth")}
					type="totalBandwidth"
					idx={null}
					checks={enrichedChecks}
					xKey="bucketDate"
					dataKeys={["totalBandwidthBytesPerSecond"]}
					gradient={true}
					gradientStartColor={theme.palette.info.main}
					gradientEndColor="#ffffff"
					strokeColor={theme.palette.info.main}
					yAxisFormatter={formatBytesPerSecond}
				/>
			</Grid>
		</Grid>
	);
};
