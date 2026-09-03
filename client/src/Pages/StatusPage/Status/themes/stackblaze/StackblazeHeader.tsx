import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import { useStatusPageTheme } from "@/Pages/StatusPage/Status/themes/StatusPageThemeProvider";
import { monoFirstChar } from "@/Pages/StatusPage/Status/themes/shared/overallStatus";

interface Props {
	companyName: string;
	logoSrc: string | null;
}

export const StackblazeHeader = ({ companyName, logoSrc }: Props) => {
	const { t } = useTranslation();
	const { tokens } = useStatusPageTheme();

	return (
		<Box
			component="header"
			sx={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 2,
				mb: 5,
				flexWrap: "wrap",
			}}
		>
			<Box
				sx={{
					display: "inline-flex",
					alignItems: "center",
					gap: 1.25,
					color: tokens.text,
					textDecoration: "none",
				}}
			>
				{logoSrc ? (
					<Box
						component="img"
						src={logoSrc}
						alt=""
						sx={{ width: 28, height: 28, objectFit: "contain" }}
					/>
				) : (
					<Box
						aria-hidden
						sx={{
							width: 22,
							height: 22,
							background: tokens.text,
							transform: "rotate(45deg)",
							borderRadius: "2px",
							position: "relative",
							"&::after": {
								content: '""',
								position: "absolute",
								inset: "5px",
								background: tokens.bg,
								borderRadius: "1px",
							},
						}}
					/>
				)}
				<Box
					component="span"
					sx={{
						fontSize: 15,
						fontWeight: 700,
						letterSpacing: "0.08em",
					}}
				>
					{companyName ? companyName.toUpperCase() : monoFirstChar(companyName)}
				</Box>
			</Box>
			<Box
				component="button"
				type="button"
				disabled
				sx={{
					appearance: "none",
					border: 0,
					background: tokens.text,
					color: tokens.bg,
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: "0.06em",
					textTransform: "uppercase",
					px: 1.75,
					py: 1.15,
					borderRadius: "4px",
					opacity: 0.9,
					cursor: "default",
				}}
			>
				{t("pages.statusPages.stackblaze.subscribe")}
			</Box>
		</Box>
	);
};
