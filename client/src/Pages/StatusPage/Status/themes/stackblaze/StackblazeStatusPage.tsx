import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import type { Monitor, MonitorStatus } from "@/Types/Monitor";
import type { StatusPage, StatusPageRange } from "@/Types/StatusPage";
import { STATUS_PAGE_RANGE_DAYS } from "@/Types/StatusPage";
import { dailyBucketsToCells, checksToCells } from "@/Pages/StatusPage/Status/themes/shared/ChartCells";
import {
	monitorBadgeTone,
	resolveOverallStatus,
	type OverallTone,
} from "@/Pages/StatusPage/Status/themes/shared/overallStatus";
import { useStatusPageTheme } from "@/Pages/StatusPage/Status/themes/StatusPageThemeProvider";
import { StackblazeHeader } from "./StackblazeHeader";
import { StackblazeIncidentBanner } from "./StackblazeIncidentBanner";
import { StackblazeUptimeBar } from "./StackblazeUptimeBar";

interface Props {
	statusPage: StatusPage;
	monitors: Monitor[];
	range: StatusPageRange;
	onRangeChange: (range: StatusPageRange) => void;
	bucketTimezone: string;
}

const statusTone = (status: MonitorStatus): OverallTone => {
	if (status === "up") return "up";
	if (status === "breached") return "warn";
	return monitorBadgeTone(status);
};

const formatUptimeLabel = (ratio: number): string => {
	const pct = Math.min(100, Math.max(0, ratio * 100));
	const formatted = pct >= 99.95 ? pct.toFixed(2) : pct.toFixed(1);
	return `${formatted} % uptime`;
};

export const StackblazeStatusPage = ({
	statusPage,
	monitors,
	range,
	onRangeChange,
	bucketTimezone,
}: Props) => {
	const { t } = useTranslation();
	const { tokens } = useStatusPageTheme();

	useEffect(() => {
		if (range !== "90d") {
			onRangeChange("90d");
		}
	}, [range, onRangeChange]);

	const overall = resolveOverallStatus(monitors, t);
	const logoSrc = statusPage.logo?.data
		? `data:${statusPage.logo.contentType};base64,${statusPage.logo.data}`
		: null;
	const affected = monitors.filter((m) => m.status !== "up");
	const days = range === "latest" ? 0 : STATUS_PAGE_RANGE_DAYS[range];

	return (
		<Box
			sx={{
				minHeight: "100vh",
				background: tokens.bg,
				color: tokens.text,
				fontFamily: tokens.fontFamily,
				px: { xs: 2.5, sm: 4 },
				pt: { xs: 5, sm: 8 },
				pb: 8,
			}}
		>
			<Box sx={{ maxWidth: 840, mx: "auto" }}>
				<StackblazeHeader
					companyName={statusPage.companyName}
					logoSrc={logoSrc}
				/>

				{overall.tone !== "up" && affected.length > 0 && (
					<StackblazeIncidentBanner
						overall={overall}
						affected={affected}
					/>
				)}

				<Box
					sx={{
						textAlign: "right",
						fontSize: 12,
						color: tokens.textMuted,
						mb: 1.25,
						mt: overall.tone === "up" ? 0 : 0,
					}}
				>
					{t("pages.statusPages.stackblaze.uptimeCaption")}
				</Box>

				<Stack gap={1.5}>
					{monitors.map((monitor) => {
						const cells =
							range === "latest"
								? checksToCells(monitor.recentChecks ?? [])
								: dailyBucketsToCells(
										monitor.dailyChecks ?? [],
										days,
										bucketTimezone,
										t
									);
						const tone = statusTone(monitor.status);
						return (
							<Box
								key={monitor.id}
								sx={{
									background: tokens.surface,
									border: `1px solid ${tokens.border}`,
									borderRadius: "8px",
									px: 2.5,
									pt: 2,
									pb: 1.75,
								}}
							>
								<Stack
									direction="row"
									alignItems="baseline"
									justifyContent="space-between"
									gap={1.5}
									mb={1.5}
								>
									<Box
										component="h3"
										sx={{
											m: 0,
											fontSize: 14.5,
											fontWeight: 600,
											letterSpacing: "-0.01em",
										}}
									>
										{monitor.name}
									</Box>
									<Box
										component="span"
										sx={{
											fontSize: 13,
											fontWeight: 500,
											whiteSpace: "nowrap",
											color:
												tone === "up"
													? tokens.up
													: tone === "down"
														? tokens.down
														: "#ca8a04",
										}}
									>
										{t(`pages.statusPages.stackblaze.status.${monitor.status}`)}
									</Box>
								</Stack>
								<StackblazeUptimeBar
									cells={cells}
									uptimeLabel={formatUptimeLabel(monitor.uptimePercentage ?? 1)}
								/>
							</Box>
						);
					})}
				</Stack>
			</Box>
		</Box>
	);
};
