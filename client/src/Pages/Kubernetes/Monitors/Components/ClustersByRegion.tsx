import { StatusLabel, Table } from "@/Components/design-elements";
import type { Header } from "@/Components/design-elements/Table";
import { SPACING } from "@/Utils/Theme/constants";
import {
	clusterKindLabelKey,
	countHealthy,
	type KubernetesCluster,
	type RegionGroup,
} from "@/Utils/kubernetesClusters";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface ClustersByRegionProps {
	regions: RegionGroup[];
	search: string;
}

const ratio = (members: KubernetesCluster["nodes"]) => {
	const { up, total } = countHealthy(members);
	if (total === 0) return "—";
	return `${up}/${total}`;
};

export const ClustersByRegion = ({ regions, search }: ClustersByRegionProps) => {
	const { t } = useTranslation();
	const theme = useTheme();
	const navigate = useNavigate();
	const q = search.trim().toLowerCase();

	const headers: Header<KubernetesCluster>[] = [
		{
			id: "name",
			align: "left",
			content: t("common.table.headers.name"),
			render: (row) => row.name,
		},
		{
			id: "kind",
			content: t("pages.kubernetes.table.headers.kind"),
			render: (row) => t(clusterKindLabelKey(row.kind)),
		},
		{
			id: "status",
			content: t("common.table.headers.status"),
			render: (row) => <StatusLabel status={row.status} />,
		},
		{
			id: "controlPlane",
			content: t("pages.kubernetes.table.headers.controlPlane"),
			render: (row) =>
				row.controlPlane[0] ? (
					<StatusLabel status={row.controlPlane[0].monitor.status} />
				) : (
					"—"
				),
		},
		{
			id: "nodes",
			content: t("pages.kubernetes.table.headers.nodes"),
			render: (row) => ratio(row.nodes),
		},
		{
			id: "deployments",
			content: t("pages.kubernetes.table.headers.deployments"),
			render: (row) => ratio(row.deployments),
		},
	];

	const visible = regions
		.map((group) => ({
			...group,
			clusters: group.clusters.filter((cluster) => {
				if (!q) return true;
				return (
					cluster.name.toLowerCase().includes(q) ||
					cluster.region.toLowerCase().includes(q) ||
					cluster.kind.toLowerCase().includes(q) ||
					(cluster.parentName || "").toLowerCase().includes(q)
				);
			}),
		}))
		.filter((group) => group.clusters.length > 0);

	if (visible.length === 0) {
		return (
			<Typography color={theme.palette.text.secondary}>
				{t("pages.kubernetes.emptySearch")}
			</Typography>
		);
	}

	return (
		<Stack gap={theme.spacing(SPACING.XXL)}>
			{visible.map((group) => (
				<Stack
					key={group.region}
					gap={theme.spacing(SPACING.SM)}
				>
					<Stack
						direction="row"
						alignItems="baseline"
						gap={theme.spacing(SPACING.MD)}
					>
						<Typography
							sx={{
								fontSize: 16,
								fontWeight: 500,
								letterSpacing: "-0.01em",
							}}
						>
							{group.region === "other"
								? t("pages.kubernetes.regions.other")
								: group.region}
						</Typography>
						<Typography
							color={theme.palette.text.secondary}
							sx={{ fontSize: 13 }}
						>
							{t("pages.kubernetes.regionCount", { count: group.clusters.length })}
						</Typography>
					</Stack>
					<Table
						headers={headers}
						data={group.clusters}
						onRowClick={(row) =>
							navigate(`/kubernetes/${encodeURIComponent(row.id)}`)
						}
					/>
				</Stack>
			))}
		</Stack>
	);
};
