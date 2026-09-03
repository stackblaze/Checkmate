import { StatusLabel, Table } from "@/Components/design-elements";
import type { Header } from "@/Components/design-elements/Table";
import type { ClusterMember } from "@/Utils/kubernetesClusters";
import { getMonitorPath } from "@/Utils/MonitorUtils";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface ClusterMembersTableProps {
	members: ClusterMember[];
	emptyText: string;
}

export const ClusterMembersTable = ({ members, emptyText }: ClusterMembersTableProps) => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const headers: Header<ClusterMember>[] = [
		{
			id: "name",
			align: "left",
			content: t("common.table.headers.name"),
			render: (row) => row.label,
		},
		{
			id: "status",
			content: t("common.table.headers.status"),
			render: (row) => <StatusLabel status={row.monitor.status} />,
		},
		{
			id: "type",
			content: t("common.table.headers.type"),
			render: (row) => row.monitor.type,
		},
	];

	return (
		<Table
			headers={headers}
			data={members}
			emptyViewText={emptyText}
			onRowClick={(row) =>
				navigate(`/${getMonitorPath(row.monitor.type)}/${row.monitor.id}`)
			}
		/>
	);
};
