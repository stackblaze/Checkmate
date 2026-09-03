import { StatusLabel, Table } from "@/Components/design-elements";
import type { Header } from "@/Components/design-elements/Table";
import { countHealthy, type KubernetesCluster } from "@/Utils/kubernetesClusters";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface ClusterTableProps {
	clusters: KubernetesCluster[];
	search: string;
	onOpen: (cluster: KubernetesCluster) => void;
}

const ratio = (members: KubernetesCluster["nodes"]) => {
	const { up, total } = countHealthy(members);
	if (total === 0) return "—";
	return `${up}/${total}`;
};

export const ClusterTable = ({ clusters, search, onOpen }: ClusterTableProps) => {
	const { t } = useTranslation();
	const theme = useTheme();
	const q = search.trim().toLowerCase();

	const headers: Header<KubernetesCluster>[] = [
		{
			id: "name",
			align: "left",
			content: t("common.table.headers.name"),
			render: (row) => (
				<Box
					component="span"
					sx={{
						color: theme.palette.primary.main,
						"&:hover": { textDecoration: "underline" },
					}}
				>
					{row.name}
				</Box>
			),
		},
		{
			id: "region",
			content: t("pages.kubernetes.table.headers.region"),
			render: (row) =>
				row.region === "other" ? t("pages.kubernetes.regions.other") : row.region,
		},
		{
			id: "status",
			content: t("common.table.headers.status"),
			render: (row) => <StatusLabel status={row.status} />,
		},
		{
			id: "tenants",
			content: t("pages.kubernetes.table.headers.tenants"),
			render: (row) =>
				row.tenants.length === 0
					? "—"
					: t("pages.kubernetes.tenantCount", { count: row.tenants.length }),
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
	];

	const visible = clusters.filter((cluster) => {
		if (!q) return true;
		return (
			cluster.name.toLowerCase().includes(q) ||
			cluster.region.toLowerCase().includes(q) ||
			cluster.tenants.some((tenant) => tenant.name.toLowerCase().includes(q))
		);
	});

	if (visible.length === 0) {
		return (
			<Typography color={theme.palette.text.secondary}>
				{t("pages.kubernetes.emptySearch")}
			</Typography>
		);
	}

	return (
		<Table
			headers={headers}
			data={visible}
			onRowClick={onOpen}
		/>
	);
};

interface TenantTableProps {
	tenants: KubernetesCluster[];
	parentId: string;
}

export const TenantTable = ({ tenants, parentId }: TenantTableProps) => {
	const { t } = useTranslation();
	const theme = useTheme();
	const navigate = useNavigate();

	const headers: Header<KubernetesCluster>[] = [
		{
			id: "name",
			align: "left",
			content: t("common.table.headers.name"),
			render: (row) => (
				<Box
					component="span"
					sx={{
						color: theme.palette.primary.main,
						"&:hover": { textDecoration: "underline" },
					}}
				>
					{row.name}
				</Box>
			),
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

	return (
		<Table
			headers={headers}
			data={tenants}
			emptyViewText={t("pages.kubernetes.empty.tenants")}
			onRowClick={(row) =>
				navigate(
					`/kubernetes/${encodeURIComponent(parentId)}/tenants/${encodeURIComponent(row.id)}`
				)
			}
		/>
	);
};
