import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import { useTranslation } from "react-i18next";
import type { BarKind, ChartCell } from "@/Pages/StatusPage/Status/themes/shared/ChartCells";
import { useStatusPageTheme } from "@/Pages/StatusPage/Status/themes/StatusPageThemeProvider";

interface Props {
	cells: ChartCell[];
	uptimeLabel: string;
}

export const StackblazeUptimeBar = ({ cells, uptimeLabel }: Props) => {
	const { t } = useTranslation();
	const { tokens } = useStatusPageTheme();

	const colorFor = (kind: BarKind) => {
		if (kind === "down") return tokens.down;
		if (kind === "degraded") return tokens.degraded;
		// Empty days (no checks retained) read as operational, matching
		// Cursor-style 90-day bars instead of a gray barcode.
		return tokens.up;
	};

	return (
		<Box>
			<Box
				role="img"
				aria-label={uptimeLabel}
				sx={{
					display: "flex",
					gap: "1.5px",
					height: 32,
					alignItems: "stretch",
				}}
			>
				{cells.map((cell) => (
					<Tooltip
						key={cell.key}
						title={cell.tooltip ?? t("pages.statusPages.stackblaze.noData")}
						arrow
						placement="top"
					>
						<Box
							aria-label={cell.ariaLabel || uptimeLabel}
							sx={{
								flex: "1 1 0",
								minWidth: 0,
								borderRadius: "2px",
								background: colorFor(cell.barKind),
							}}
						/>
					</Tooltip>
				))}
			</Box>
			<Box
				sx={{
					position: "relative",
					mt: 1.25,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					fontSize: 11,
					color: tokens.textMuted,
					"&::before": {
						content: '""',
						position: "absolute",
						left: 0,
						right: 0,
						top: "50%",
						height: "1px",
						background: tokens.border,
						pointerEvents: "none",
					},
				}}
			>
				<Box sx={{ pr: 1, background: tokens.surface, position: "relative" }}>
					{t("pages.statusPages.stackblaze.daysAgo")}
				</Box>
				<Box
					sx={{
						px: 1,
						background: tokens.surface,
						position: "relative",
						fontWeight: 500,
						color: tokens.text,
					}}
				>
					{uptimeLabel}
				</Box>
				<Box sx={{ pl: 1, background: tokens.surface, position: "relative" }}>
					{t("pages.statusPages.stackblaze.today")}
				</Box>
			</Box>
		</Box>
	);
};
