import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { post } from "@/Utils/ApiClient";
import { useStatusPageTheme } from "@/Pages/StatusPage/Status/themes/StatusPageThemeProvider";

interface Props {
	open: boolean;
	url: string;
	companyName: string;
	onClose: () => void;
}

export const StackblazeSubscribeDialog = ({ open, url, companyName, onClose }: Props) => {
	const { t } = useTranslation();
	const { tokens, mode } = useStatusPageTheme();
	const ink = mode === "dark" ? "#fafafa" : "#212018";
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);

	const resetAndClose = () => {
		setEmail("");
		setError(null);
		setDone(false);
		setLoading(false);
		onClose();
	};

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		if (loading) {
			return;
		}
		setLoading(true);
		setError(null);
		try {
			await post(`/status-page/${url}/subscribe`, { email: email.trim() });
			setDone(true);
		} catch (err: unknown) {
			const axiosErr = err as { response?: { data?: { msg?: string } } };
			setError(axiosErr.response?.data?.msg || t("pages.statusPages.stackblaze.subscribeForm.error"));
		} finally {
			setLoading(false);
		}
	};

	return (
		<Modal
			open={open}
			onClose={resetAndClose}
			aria-labelledby="stackblaze-subscribe-title"
		>
			<Box
				sx={{
					position: "absolute",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					width: "min(480px, calc(100vw - 32px))",
					background: tokens.surface,
					color: tokens.text,
					border: `1px solid ${tokens.border}`,
					borderRadius: "8px",
					boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
					p: "32px 36px 28px",
					fontFamily: tokens.fontFamily,
					outline: "none",
					boxSizing: "border-box",
				}}
			>
				<Box
					id="stackblaze-subscribe-title"
					sx={{ fontSize: 22, fontWeight: 700, mb: "10px", color: ink, lineHeight: 1.3 }}
				>
					{t("pages.statusPages.stackblaze.subscribe")}
				</Box>
				{done ? (
					<>
						<Box sx={{ fontSize: 14, lineHeight: 1.6, mb: "24px", color: tokens.text }}>
							{t("pages.statusPages.stackblaze.subscribeForm.success", { name: companyName })}
						</Box>
						<Box
							component="button"
							type="button"
							onClick={resetAndClose}
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
								py: "10px",
								borderRadius: "4px",
								cursor: "pointer",
								fontFamily: "inherit",
							}}
						>
							{t("pages.statusPages.stackblaze.subscribeForm.close")}
						</Box>
					</>
				) : (
					<Box
						component="form"
						onSubmit={onSubmit}
					>
						<Box sx={{ fontSize: 14, lineHeight: 1.6, mb: "20px", color: tokens.textMuted }}>
							{t("pages.statusPages.stackblaze.subscribeForm.help", { name: companyName })}
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
								background: tokens.bg,
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
									background: ink,
									color: mode === "dark" ? "#111" : "#fff",
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
									? t("pages.statusPages.stackblaze.subscribeForm.submitting")
									: t("pages.statusPages.stackblaze.subscribeShort")}
							</Box>
							<Box
								component="button"
								type="button"
								onClick={resetAndClose}
								sx={{
									appearance: "none",
									border: 0,
									background: "transparent",
									color: tokens.textMuted,
									fontSize: 13,
									cursor: "pointer",
									fontFamily: "inherit",
								}}
							>
								{t("pages.statusPages.stackblaze.subscribeForm.cancel")}
							</Box>
						</Box>
					</Box>
				)}
			</Box>
		</Modal>
	);
};
