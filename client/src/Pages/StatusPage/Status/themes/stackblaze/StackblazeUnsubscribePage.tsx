import Box from "@mui/material/Box";
import { useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { post } from "@/Utils/ApiClient";
import { PUBLIC_STATUS_PAGE_PREFIX } from "@/Types/StatusPage";
import { themeTokens } from "@/Pages/StatusPage/Status/themes/tokens";
import { StackblazeMark } from "./StackblazeMark";

export const StackblazeUnsubscribePage = () => {
	const { t } = useTranslation();
	const { url } = useParams();
	const [searchParams] = useSearchParams();
	const tokens = themeTokens.stackblaze.light;
	const presetEmail = searchParams.get("email")?.trim() ?? "";
	const [email, setEmail] = useState(presetEmail);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);
	const statusPath = `${PUBLIC_STATUS_PAGE_PREFIX}/${url}?range=90d`;

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		if (loading || !url) {
			return;
		}
		setLoading(true);
		setError(null);
		try {
			await post(`/status-page/${url}/unsubscribe`, { email: email.trim() });
			setDone(true);
		} catch (err: unknown) {
			const axiosErr = err as { response?: { data?: { msg?: string } } };
			setError(axiosErr.response?.data?.msg || t("pages.statusPages.stackblaze.unsubscribeForm.error"));
		} finally {
			setLoading(false);
		}
	};

	return (
		<Box
			sx={{
				minHeight: "100vh",
				background: tokens.bg,
				color: tokens.text,
				fontFamily: tokens.fontFamily,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				px: 2,
			}}
		>
			<Box sx={{ width: "min(480px, 100%)", py: 8 }}>
				<Box sx={{ display: "flex", alignItems: "center", gap: "10px", mb: "28px" }}>
					<StackblazeMark />
					<Box sx={{ fontSize: 22, fontWeight: 700, color: "#111", letterSpacing: "-0.02em" }}>
						stackblaze
					</Box>
				</Box>
				<Box sx={{ fontSize: 28, fontWeight: 700, mb: "12px", color: "#111", lineHeight: 1.25, fontFamily: "Georgia, Times, serif" }}>
					{done
						? t("pages.statusPages.stackblaze.unsubscribeForm.doneTitle")
						: t("pages.statusPages.stackblaze.unsubscribeForm.title")}
				</Box>
				{done ? (
					<>
						<Box sx={{ fontSize: 15, lineHeight: 1.6, mb: "24px", color: tokens.textMuted }}>
							{t("pages.statusPages.stackblaze.unsubscribeForm.success")}
						</Box>
						<Box
							component={Link}
							to={statusPath}
							sx={{
								display: "inline-block",
								background: "#111",
								color: "#fff",
								fontSize: 12,
								fontWeight: 500,
								letterSpacing: "2px",
								textTransform: "uppercase",
								px: "15px",
								py: "10px",
								borderRadius: "4px",
								textDecoration: "none",
							}}
						>
							{t("pages.statusPages.stackblaze.unsubscribeForm.back")}
						</Box>
					</>
				) : (
					<Box component="form" onSubmit={onSubmit}>
						<Box sx={{ fontSize: 15, lineHeight: 1.6, mb: "20px", color: tokens.textMuted }}>
							{t("pages.statusPages.stackblaze.unsubscribeForm.help")}
						</Box>
						<Box
							component="input"
							required
							type="email"
							autoComplete="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							placeholder={t("pages.statusPages.stackblaze.subscribeForm.placeholder")}
							sx={{
								display: "block",
								width: "100%",
								boxSizing: "border-box",
								border: `1px solid ${tokens.border}`,
								borderRadius: "4px",
								background: tokens.surface,
								color: tokens.text,
								fontSize: 14,
								px: "14px",
								py: "12px",
								mb: "20px",
								fontFamily: "inherit",
								outline: "none",
							}}
						/>
						{error && (
							<Box sx={{ fontSize: 13, color: tokens.down, mb: "16px" }}>
								{error}
							</Box>
						)}
						<Box sx={{ display: "flex", gap: "16px", alignItems: "center" }}>
							<Box
								component="button"
								type="submit"
								disabled={loading}
								sx={{
									appearance: "none",
									border: 0,
									background: "#111",
									color: "#fff",
									fontSize: 12,
									fontWeight: 500,
									letterSpacing: "2px",
									textTransform: "uppercase",
									px: "15px",
									py: "10px",
									borderRadius: "4px",
									cursor: loading ? "wait" : "pointer",
									opacity: loading ? 0.7 : 1,
									fontFamily: "inherit",
								}}
							>
								{loading
									? t("pages.statusPages.stackblaze.unsubscribeForm.submitting")
									: t("pages.statusPages.stackblaze.unsubscribeForm.confirm")}
							</Box>
							<Box
								component={Link}
								to={statusPath}
								sx={{ fontSize: 13, color: tokens.textMuted, textDecoration: "none" }}
							>
								{t("pages.statusPages.stackblaze.unsubscribeForm.cancel")}
							</Box>
						</Box>
					</Box>
				)}
			</Box>
		</Box>
	);
};
