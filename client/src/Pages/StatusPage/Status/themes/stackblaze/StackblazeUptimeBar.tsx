import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import { useTranslation } from "react-i18next";
import type { ChartCell } from "@/Pages/StatusPage/Status/themes/shared/ChartCells";
import { useStatusPageTheme } from "@/Pages/StatusPage/Status/themes/StatusPageThemeProvider";

interface Props {
	cells: ChartCell[];
	uptimeLabel: string;
}

export const StackblazeUptimeBar = ({ cells, uptimeLabel }: Props) => {
	const { t } = useTranslation();
	const { tokens } = useStatusPageTheme();
	const colorFor = (kind: ChartCell["barKind"]) => {
		if (kind === "up") return tokens.up;
		if (kind === "degraded") return tokens.degraded;
		if (kind === "down") return tokens.down;
		return tokens.border;
	};

	return (
		<Box>
			<Box
				role="img"
				aria-label={uptimeLabel}
				sx={{
					display: "flex",
					gap: "2px",
					height: 34,
					alignItems: "stretch",
				}}
			>
				{cells.map((cell) => {
					const seg = (
						<Box
							sx={{
								flex: "1 1 0",
								minWidth: 0,
								borderRadius: "1px",
								background: colorFor(cell.barKind),
								height: "100%",
							}}
							aria-label={cell.ariaLabel}
						/>
					);
					if (!cell.tooltip) {
						return (
							<Box
								key={cell.key}
								sx={{ flex: "1 1 0", minWidth: 0, height: "100%" }}
							>
								{seg}
							</Box>
						);
					}
					return (
						<Tooltip
							key={cell.key}
							title={cell.tooltip}
							arrow
							placement="top"
						>
							<Box sx={{ flex: "1 1 0", minWidth: 0, height: "100%" }}>{seg}</Box>
						</Tooltip>
					);
				})}
			</Box>
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: "1fr auto 1fr",
					gap: 1,
					mt: 1,
					fontSize: 11,
					color: tokens.textMuted,
				}}
			>
				<Box>{t("pages.statusPages.stackblaze.daysAgo")}</Box>
				<Box sx={{ textAlign: "center", fontWeight: 500, color: tokens.text }}>
					{uptimeLabel}
				</Box>
				<Box sx={{ textAlign: "right" }}>{t("pages.statusPages.stackblaze.today")}</Box>
			</Box>
		</Box>
	);
};
