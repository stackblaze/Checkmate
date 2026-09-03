import Box from "@mui/material/Box";
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
		return tokens.up;
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
					mt: 1.5,
				}}
			>
				{cells.map((cell) => (
					<Box
						key={cell.key}
						title={
							typeof cell.ariaLabel === "string" && cell.ariaLabel
								? cell.ariaLabel
								: t("pages.statusPages.stackblaze.noData")
						}
						aria-label={cell.ariaLabel || uptimeLabel}
						sx={{
							flex: "1 1 0",
							minWidth: 0,
							background: colorFor(cell.barKind),
						}}
					/>
				))}
			</Box>
			<Box
				sx={{
					mt: 0.75,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					fontSize: 14,
					color: tokens.textMuted,
					lineHeight: "24px",
				}}
			>
				<Box>{t("pages.statusPages.stackblaze.daysAgo")}</Box>
				<Box sx={{ color: tokens.text }}>{uptimeLabel}</Box>
				<Box>{t("pages.statusPages.stackblaze.today")}</Box>
			</Box>
		</Box>
	);
};
