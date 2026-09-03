import { BasePage, StatusLabel } from "@/Components/design-elements";
import { useKubernetesClusters } from "@/Hooks/useKubernetesClusters";
import { ClusterMembersTable } from "@/Pages/Kubernetes/Details/Components/ClusterMembersTable";
import { clusterKindLabelKey } from "@/Utils/kubernetesClusters";
import { SPACING } from "@/Utils/Theme/constants";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { ChevronLeft } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useParams } from "react-router-dom";

const KubernetesDetails = () => {
	const { t } = useTranslation();
	const theme = useTheme();
	const { clusterId } = useParams<{ clusterId: string }>();
	const { clusters, isLoading, error } = useKubernetesClusters();

	const cluster = useMemo(() => {
		if (!clusterId) return undefined;
		const decoded = decodeURIComponent(clusterId);
		return clusters.find((c) => c.id === decoded);
	}, [clusterId, clusters]);

	const backLink = (
		<Box
			component={RouterLink}
			to="/kubernetes"
			sx={{
				display: "inline-flex",
				alignItems: "center",
				gap: 0.5,
				textDecoration: "none",
				color: theme.palette.text.secondary,
				fontSize: 13,
				"&:hover": { color: theme.palette.text.primary },
			}}
		>
			<ChevronLeft
				size={14}
				strokeWidth={1.8}
			/>
			{t("pages.kubernetes.back")}
		</Box>
	);

	if (!isLoading && !cluster) {
		return (
			<BasePage
				error={error}
				breadcrumbOverride={[]}
			>
				<Stack gap={theme.spacing(SPACING.MD)}>
					{backLink}
					<Typography color={theme.palette.text.secondary}>
						{t("pages.kubernetes.notFound")}
					</Typography>
				</Stack>
			</BasePage>
		);
	}

	return (
		<BasePage
			loading={isLoading && !cluster}
			error={error}
			breadcrumbOverride={[]}
		>
			{cluster && (
				<Stack gap={theme.spacing(SPACING.XXL)}>
					{backLink}
					<Stack
						direction="row"
						alignItems="center"
						flexWrap="wrap"
						gap={theme.spacing(SPACING.MD)}
					>
						<Typography
							sx={{
								fontSize: 26,
								fontWeight: 400,
								letterSpacing: "-0.02em",
								lineHeight: 1.15,
							}}
						>
							{cluster.name}
						</Typography>
						<StatusLabel status={cluster.status} />
					</Stack>
					<Typography
						color={theme.palette.text.secondary}
						sx={{ fontSize: 14 }}
					>
						{cluster.region === "other"
							? t("pages.kubernetes.regions.other")
							: cluster.region}
						{" · "}
						{t(clusterKindLabelKey(cluster.kind))}
						{cluster.parentName
							? ` · ${t("pages.kubernetes.hostedOn", { cluster: cluster.parentName })}`
							: ""}
					</Typography>

					<Stack gap={theme.spacing(SPACING.SM)}>
						<Typography sx={{ fontSize: 16, fontWeight: 500 }}>
							{t("pages.kubernetes.sections.controlPlane")}
						</Typography>
						<ClusterMembersTable
							members={cluster.controlPlane}
							emptyText={t("pages.kubernetes.empty.controlPlane")}
						/>
					</Stack>

					<Stack gap={theme.spacing(SPACING.SM)}>
						<Typography sx={{ fontSize: 16, fontWeight: 500 }}>
							{t("pages.kubernetes.sections.nodes")}
						</Typography>
						<ClusterMembersTable
							members={cluster.nodes}
							emptyText={t("pages.kubernetes.empty.nodes")}
						/>
					</Stack>

					<Stack gap={theme.spacing(SPACING.SM)}>
						<Typography sx={{ fontSize: 16, fontWeight: 500 }}>
							{t("pages.kubernetes.sections.deployments")}
						</Typography>
						<ClusterMembersTable
							members={cluster.deployments}
							emptyText={t("pages.kubernetes.empty.deployments")}
						/>
					</Stack>
				</Stack>
			)}
		</BasePage>
	);
};

export default KubernetesDetails;
