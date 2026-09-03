import { BasePage, StatusLabel } from "@/Components/design-elements";
import { useKubernetesClusters } from "@/Hooks/useKubernetesClusters";
import { ClusterMembersTable } from "@/Pages/Kubernetes/Details/Components/ClusterMembersTable";
import { TenantTable } from "@/Pages/Kubernetes/Monitors/Components/ClustersByRegion";
import { clusterKindLabelKey, type KubernetesCluster } from "@/Utils/kubernetesClusters";
import { SPACING } from "@/Utils/Theme/constants";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { ChevronLeft } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useParams } from "react-router-dom";

const BackLink = ({ to, label }: { to: string; label: string }) => {
	const theme = useTheme();
	return (
		<Box
			component={RouterLink}
			to={to}
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
			{label}
		</Box>
	);
};

const MemberSections = ({ cluster }: { cluster: KubernetesCluster }) => {
	const { t } = useTranslation();
	const theme = useTheme();
	return (
		<>
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
		</>
	);
};

const KubernetesDetails = () => {
	const { t } = useTranslation();
	const theme = useTheme();
	const { clusterId, tenantId } = useParams<{ clusterId: string; tenantId?: string }>();
	const { clusters, isLoading, error } = useKubernetesClusters();

	const parent = useMemo(() => {
		if (!clusterId) return undefined;
		return clusters.find((c) => c.id === decodeURIComponent(clusterId));
	}, [clusterId, clusters]);

	const cluster = useMemo(() => {
		if (tenantId) {
			const decoded = decodeURIComponent(tenantId);
			return (
				parent?.tenants.find((c) => c.id === decoded) ||
				clusters.find((c) => c.id === decoded)
			);
		}
		return parent;
	}, [tenantId, parent, clusters]);

	const backTo = tenantId && parent
		? `/kubernetes/${encodeURIComponent(parent.id)}`
		: cluster?.parentName
			? `/kubernetes/${encodeURIComponent(cluster.parentName)}`
			: "/kubernetes";
	const backLabel = tenantId && parent
		? parent.name
		: cluster?.parentName || t("pages.kubernetes.back");

	if (!isLoading && !cluster) {
		return (
			<BasePage
				error={error}
				breadcrumbOverride={[]}
			>
				<Stack gap={theme.spacing(SPACING.MD)}>
					<BackLink
						to="/kubernetes"
						label={t("pages.kubernetes.back")}
					/>
					<Typography color={theme.palette.text.secondary}>
						{t("pages.kubernetes.notFound")}
					</Typography>
				</Stack>
			</BasePage>
		);
	}

	const showTenants = Boolean(cluster && !tenantId && cluster.tenants.length > 0);

	return (
		<BasePage
			loading={isLoading && !cluster}
			error={error}
			breadcrumbOverride={[]}
		>
			{cluster && (
				<Stack gap={theme.spacing(SPACING.XXL)}>
					<BackLink
						to={backTo}
						label={backLabel}
					/>
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
					</Typography>

					{showTenants && (
						<Stack gap={theme.spacing(SPACING.SM)}>
							<Typography sx={{ fontSize: 16, fontWeight: 500 }}>
								{t("pages.kubernetes.sections.tenants")}
							</Typography>
							<TenantTable
								tenants={cluster.tenants}
								parentId={cluster.id}
							/>
						</Stack>
					)}

					<MemberSections cluster={cluster} />
				</Stack>
			)}
		</BasePage>
	);
};

export default KubernetesDetails;
