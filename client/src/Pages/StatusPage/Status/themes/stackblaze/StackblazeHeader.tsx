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
	const { mode } = useStatusPageTheme();
	const ink = mode === "dark" ? "#fafafa" : "#212018";

	return (
		<Box
			component="header"
			sx={{
				display: "flex",
				alignItems: "flex-start",
				justifyContent: "space-between",
				gap: 2,
				pt: "70px",
				pb: "70px",
			}}
		>
			<Box
				sx={{
					display: "inline-flex",
					alignItems: "center",
					gap: 1.5,
					color: ink,
					minWidth: 0,
				}}
			>
				{logoSrc ? (
					<Box
						component="img"
						src={logoSrc}
						alt=""
						sx={{ height: 72, maxWidth: 220, objectFit: "contain" }}
					/>
				) : (
					<>
						<StackblazeMark
							size={40}
							color={ink}
						/>
						<Box
							component="span"
							sx={{
								fontSize: 28,
								fontWeight: 700,
								letterSpacing: "0.04em",
								lineHeight: 1,
								textTransform: "uppercase",
							}}
						>
							{companyName}
						</Box>
					</>
				)}
			</Box>
			<Box
				component="button"
				type="button"
				sx={{
					appearance: "none",
					border: 0,
					background: ink,
					color: mode === "dark" ? "#111" : "#fff",
					fontSize: 12,
					fontWeight: 500,
					letterSpacing: "2px",
					textTransform: "uppercase",
					px: "15px",
					pt: "10px",
					pb: "9px",
					borderRadius: "4px",
					cursor: "default",
					whiteSpace: "nowrap",
					fontFamily: "inherit",
					lineHeight: 1.55,
				}}
			>
				{t("pages.statusPages.stackblaze.subscribe")}
			</Box>
		</Box>
	);
};
