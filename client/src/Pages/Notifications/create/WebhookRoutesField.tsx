import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/Components/inputs";
import { FormTextField } from "@/Components/inputs/forms/FormTextField";
import { FormMultiSelectField } from "@/Components/inputs/forms/FormMultiSelectField";
import { FormSwitchField } from "@/Components/inputs/forms/FormSwitchField";
import { ColoredLabel } from "@/Components/design-elements";
import Box from "@mui/material/Box";
import { LAYOUT } from "@/Utils/Theme/constants";
import type { Tag } from "@/Types/Tag";
import type { WebhookRoute } from "@/Types/Notification";

interface WebhookRoutingForm {
	webhookRoutes?: WebhookRoute[];
	alsoNotifyDefault?: boolean;
}

export const WebhookRoutesField = ({ tags }: { tags: Tag[] }) => {
	const { t } = useTranslation();
	const theme = useTheme();
	const { watch, setValue } = useFormContext<WebhookRoutingForm>();
	const routes = watch("webhookRoutes") ?? [];

	const addRoute = () => {
		setValue("webhookRoutes", [...routes, { name: "", address: "", tagIds: [] }], {
			shouldDirty: true,
			shouldValidate: true,
		});
	};

	const removeRoute = (index: number) => {
		setValue(
			"webhookRoutes",
			routes.filter((_, routeIndex) => routeIndex !== index),
			{ shouldDirty: true, shouldValidate: true }
		);
	};

	return (
		<Stack spacing={theme.spacing(LAYOUT.MD)}>
			{routes.length === 0 && (
				<Typography color={theme.palette.text.secondary}>
					{t("pages.notifications.form.webhookRoutes.empty")}
				</Typography>
			)}
			{routes.map((_, index) => (
				<Stack
					key={index}
					spacing={theme.spacing(LAYOUT.SM)}
					padding={theme.spacing(LAYOUT.SM)}
					borderRadius={theme.shape.borderRadius}
					border={`1px solid ${theme.palette.divider}`}
				>
					<Stack
						direction="row"
						alignItems="flex-start"
						spacing={theme.spacing(LAYOUT.XS)}
					>
						<FormTextField
							name={`webhookRoutes.${index}.name`}
							fieldLabel={t("pages.notifications.form.webhookRoutes.optionName")}
							placeholder={t("pages.notifications.form.webhookRoutes.placeholderName")}
						/>
						<IconButton
							size="small"
							onClick={() => removeRoute(index)}
							aria-label={t("common.buttons.removeItem", {
								item: t("pages.notifications.form.webhookRoutes.optionAddress"),
							})}
						>
							<Trash2 size={16} />
						</IconButton>
					</Stack>
					<FormTextField
						name={`webhookRoutes.${index}.address`}
						fieldLabel={t("pages.notifications.form.webhookRoutes.optionAddress")}
						placeholder={t("pages.notifications.form.webhookRoutes.placeholderAddress")}
					/>
					<FormMultiSelectField
						name={`webhookRoutes.${index}.tagIds`}
						fieldLabel={t("pages.notifications.form.webhookRoutes.optionTags")}
						placeholder={t("pages.notifications.form.webhookRoutes.placeholderTags")}
						options={tags}
						renderRow={(tag) => (
							<Box flexGrow={1}>
								<ColoredLabel
									text={tag.name}
									color={tag.color}
								/>
							</Box>
						)}
						renderOptionContent={(option) => (
							<ColoredLabel
								text={option.name}
								color={option.color}
							/>
						)}
					/>
				</Stack>
			))}
			<Button
				variant="outlined"
				color="primary"
				onClick={addRoute}
				startIcon={<Plus size={16} />}
			>
				{t("common.buttons.addWebhook")}
			</Button>
			{routes.length > 0 && (
				<FormSwitchField
					name="alsoNotifyDefault"
					label={t("pages.notifications.form.webhookRoutes.alsoNotifyDefault")}
				/>
			)}
		</Stack>
	);
};
