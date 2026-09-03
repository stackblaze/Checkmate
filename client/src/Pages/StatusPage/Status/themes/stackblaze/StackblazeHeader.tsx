import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import { useStatusPageTheme } from "@/Pages/StatusPage/Status/themes/StatusPageThemeProvider";
import { StackblazeMark } from "./StackblazeMark";

interface Props {
	companyName: string;
	logoSrc: string | null;
}

export const StackblazeHeader = ({ companyName, logoSrc }: Props) => {
	const { t } = useTranslation();
	const { tokens, mode } = useStatusPageTheme();

	return (
		<Box
			component="header"
			sx={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 2,
				mb: { xs: 7, sm: 10 },
			}}
		>
			<Box
				sx={{
					display: "inline-flex",
					alignItems: "center",
					gap: 1.5,
					color: tokens.text,
					minWidth: 0,
				}}
			>
				{logoSrc ? (
					<Box
						component="img"
						src={logoSrc}
						alt=""
						sx={{ width: 32, height: 32, objectFit: "contain" }}
					/>
				) : (
					<StackblazeMark
						size={32}
						color={mode === "dark" ? "#fafafa" : "#111111"}
					/>
				)}
				<Box
					component="span"
					sx={{
						fontSize: 20,
						fontWeight: 700,
						letterSpacing: "0.02em",
						lineHeight: 1,
					}}
				>
					{companyName}
				</Box>
			</Box>
			<Box
				component="button"
				type="button"
				sx={{
					appearance: "none",
					border: 0,
					background: mode === "dark" ? "#fafafa" : "#1a1a1a",
					color: mode === "dark" ? "#111" : "#fff",
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: "0.08em",
					textTransform: "uppercase",
					px: 1.75,
					py: 1.1,
					borderRadius: "4px",
					cursor: "default",
					whiteSpace: "nowrap",
					fontFamily: "inherit",
				}}
			>
				{t("pages.statusPages.stackblaze.subscribe")}
			</Box>
		</Box>
	);
};
