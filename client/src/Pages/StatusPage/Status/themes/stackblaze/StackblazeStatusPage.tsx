import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
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
import { StackblazeOverallBanner } from "./StackblazeOverallBanner";
import { StackblazeUptimeBar } from "./StackblazeUptimeBar";
import { StackblazeSubscribeDialog } from "./StackblazeSubscribeDialog";

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
	const formatted = pct >= 99.95 ? pct.toFixed(2) : pct.toFixed(2).replace(/0$/, "");
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
	const [subscribeOpen, setSubscribeOpen] = useState(false);

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
				px: { xs: 2, sm: 3 },
				pb: 10,
			}}
		>
			<Box sx={{ maxWidth: 701, mx: "auto" }}>
				<StackblazeHeader
					companyName={statusPage.companyName}
					logoSrc={logoSrc}
					onSubscribe={() => setSubscribeOpen(true)}
				/>

				<StackblazeOverallBanner tone={overall.tone} />

				{overall.tone !== "up" && affected.length > 0 && (
					<Box sx={{ mt: -6, mb: 6 }}>
						<StackblazeIncidentBanner
							overall={overall}
							affected={affected}
							onSubscribe={() => setSubscribeOpen(true)}
						/>
					</Box>
				)}

				<Box
					sx={{
						textAlign: "right",
						fontSize: "13.6px",
						lineHeight: "24px",
						color: tokens.textMuted,
						mb: 0.5,
					}}
				>
					{t("pages.statusPages.stackblaze.uptimeCaption")}{" "}
					<Box
						component="span"
						sx={{ textDecoration: "underline", textUnderlineOffset: "2px" }}
					>
						{t("pages.statusPages.stackblaze.viewHistorical")}
					</Box>
				</Box>

				<Box
					sx={{
						border: `1px solid ${tokens.border}`,
						borderRadius: "4px",
						overflow: "hidden",
						background: tokens.surface,
					}}
				>
					{monitors.map((monitor, index) => {
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
									px: "20px",
									pt: "17.6px",
									pb: "16px",
									borderTop: index === 0 ? 0 : `1px solid ${tokens.border}`,
								}}
							>
								<Box
									sx={{
										display: "flex",
										alignItems: "baseline",
										justifyContent: "space-between",
										gap: 2,
									}}
								>
									<Box
										component="span"
										sx={{
											fontSize: 16,
											fontWeight: 500,
											lineHeight: "24px",
											color: tokens.text,
										}}
									>
										{monitor.name}
									</Box>
									<Box
										component="span"
										sx={{
											fontSize: 14,
											fontWeight: 400,
											lineHeight: "24px",
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
								</Box>
								<StackblazeUptimeBar
									cells={cells}
									uptimeLabel={formatUptimeLabel(monitor.uptimePercentage ?? 1)}
								/>
							</Box>
						);
					})}
				</Box>
			</Box>
			<StackblazeSubscribeDialog
				open={subscribeOpen}
				url={statusPage.url}
				companyName={statusPage.companyName}
				onClose={() => setSubscribeOpen(false)}
			/>
		</Box>
	);
};
