import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import type { OverallTone } from "@/Pages/StatusPage/Status/themes/shared/overallStatus";

interface Props {
	tone: OverallTone;
}

const bannerBg: Record<OverallTone, string> = {
	up: "#1e8542",
	warn: "#f1c40f",
	down: "#e74c3c",
};

const bannerFg: Record<OverallTone, string> = {
	up: "#ffffff",
	warn: "#3f2e05",
	down: "#ffffff",
};

export const StackblazeOverallBanner = ({ tone }: Props) => {
	const { t } = useTranslation();
	const message =
		tone === "up"
			? t("pages.statusPages.stackblaze.allOperational")
			: tone === "down"
				? t("pages.statusPages.statusBar.allDown")
				: t("pages.statusPages.statusBar.degraded");

	return (
		<Box
			role="status"
			sx={{
				background: bannerBg[tone],
				color: bannerFg[tone],
				border: "1px solid rgba(0,0,0,0.1)",
				borderRadius: "4px",
				px: "20px",
				py: "18px",
				mb: "70px",
			}}
		>
			<Box
				component="h2"
				sx={{
					m: 0,
					fontSize: 20,
					fontWeight: 500,
					lineHeight: "29px",
					letterSpacing: 0,
				}}
			>
				{message}
			</Box>
		</Box>
	);
};
