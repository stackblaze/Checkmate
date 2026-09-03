import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import type { Monitor } from "@/Types/Monitor";
import type { OverallStatus } from "@/Pages/StatusPage/Status/themes/shared/overallStatus";
import { useStatusPageTheme } from "@/Pages/StatusPage/Status/themes/StatusPageThemeProvider";

interface Props {
	overall: OverallStatus;
	affected: Pick<Monitor, "name" | "status">[];
}

export const StackblazeIncidentBanner = ({ overall, affected }: Props) => {
	const { t } = useTranslation();
	const { tokens } = useStatusPageTheme();
	const names = affected.map((m) => m.name);
	const primary = names[0] ?? "";
	const isOutage = overall.tone === "down";
	const title =
		names.length === 1
			? t(
					isOutage
						? "pages.statusPages.stackblaze.incident.outageOne"
						: "pages.statusPages.stackblaze.incident.degradedOne",
					{ name: primary }
				)
			: t(
					isOutage
						? "pages.statusPages.stackblaze.incident.outageMany"
						: "pages.statusPages.stackblaze.incident.degradedMany"
				);
	const body = t(
		isOutage
			? "pages.statusPages.stackblaze.incident.outageBody"
			: "pages.statusPages.stackblaze.incident.degradedBody",
		{ name: names.length === 1 ? primary : names.slice(0, 3).join(", ") }
	);
	const stamped = new Date().toLocaleString("en-US", {
		month: "short",
		day: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "UTC",
		timeZoneName: "short",
	});

	return (
		<Box
			component="article"
			role="status"
			sx={{
				mb: 6,
				border: `1px solid ${tokens.degraded}`,
				borderRadius: "6px",
				overflow: "hidden",
				background: tokens.surface,
			}}
		>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 2,
					background: tokens.degraded,
					color: "#3f2e05",
					px: 2,
					py: 1.35,
					fontSize: 14,
					fontWeight: 600,
				}}
			>
				{title}
				<Box
					component="span"
					sx={{
						fontSize: 13,
						fontWeight: 500,
						textDecoration: "underline",
						textUnderlineOffset: "2px",
					}}
				>
					{t("pages.statusPages.stackblaze.subscribeShort")}
				</Box>
			</Box>
			<Box sx={{ px: 2, py: 1.75 }}>
				<Box sx={{ m: 0, fontSize: 14, mb: 0.75, color: tokens.text }}>
					<strong>{t("pages.statusPages.stackblaze.incident.investigating")}</strong>
					{" — "}
					{body}
				</Box>
				<Box
					component="time"
					sx={{ fontSize: 12, color: tokens.textMuted }}
				>
					{stamped}
				</Box>
			</Box>
		</Box>
	);
};
