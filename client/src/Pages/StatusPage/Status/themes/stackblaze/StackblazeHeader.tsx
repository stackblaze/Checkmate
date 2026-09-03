import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import { useStatusPageTheme } from "@/Pages/StatusPage/Status/themes/StatusPageThemeProvider";
import { StackblazeMark } from "./StackblazeMark";

interface Props {
	companyName: string;
	logoSrc: string | null;
	onSubscribe: () => void;
}

export const StackblazeHeader = ({ companyName, logoSrc, onSubscribe }: Props) => {
	const { t } = useTranslation();
	const { mode } = useStatusPageTheme();
	const ink = mode === "dark" ? "#fafafa" : "#111111";

	return (
		<Box
			component="header"
			sx={{
				display: "flex",
				alignItems: "center",
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
					gap: "14px",
					minWidth: 0,
					color: ink,
				}}
			>
				{logoSrc ? (
					<Box
						component="img"
						src={logoSrc}
						alt=""
						sx={{
							height: 56,
							width: "auto",
							maxWidth: 56,
							objectFit: "contain",
							objectPosition: "left center",
						}}
					/>
				) : (
					<StackblazeMark size={56} />
				)}
				<Box
					component="span"
					sx={{
						fontSize: 40,
						fontWeight: 600,
						letterSpacing: "-0.03em",
						lineHeight: 1,
						textTransform: "lowercase",
						color: ink,
					}}
				>
					{companyName}
				</Box>
			</Box>
			<Box
				component="button"
				type="button"
				onClick={onSubscribe}
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
					cursor: "pointer",
					whiteSpace: "nowrap",
					fontFamily: "inherit",
					lineHeight: 1.55,
					flexShrink: 0,
				}}
			>
				{t("pages.statusPages.stackblaze.subscribe")}
			</Box>
		</Box>
	);
};
