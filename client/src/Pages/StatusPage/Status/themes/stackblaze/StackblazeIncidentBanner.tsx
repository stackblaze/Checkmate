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
				mb: 3.5,
				border: `1px solid ${tokens.warn}`,
				borderRadius: tokens.radius,
				overflow: "hidden",
				background: tokens.surface,
			}}
		>
			<Box
				sx={{
					background: tokens.warn,
					color: "#422006",
					px: 1.75,
					py: 1.25,
					fontSize: 14,
					fontWeight: 600,
				}}
			>
				{title}
			</Box>
			<Box sx={{ px: 2, py: 1.75 }}>
				<Box sx={{ m: 0, fontSize: 14, mb: 1 }}>
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
