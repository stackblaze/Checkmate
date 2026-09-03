import { BasePage, EmptyMonitorFallback } from "@/Components/design-elements";
import { HeaderCreate } from "@/Components/common";
import { TextField } from "@/Components/inputs";
import { useIsAdmin } from "@/Hooks/useIsAdmin";
import { useKubernetesClusters } from "@/Hooks/useKubernetesClusters";
import { KubernetesStatusBoxes } from "@/Pages/Kubernetes/Components/StatusBoxes";
import { ClusterTable } from "@/Pages/Kubernetes/Monitors/Components/ClustersByRegion";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const KubernetesMonitors = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const isAdmin = useIsAdmin();
	const { listClusters, summary, isLoading, error } = useKubernetesClusters();
	const [search, setSearch] = useState("");

	if (error && listClusters.length === 0) {
		return (
			<BasePage
				error={error}
				headerKey="kubernetes"
			>
				{null}
			</BasePage>
		);
	}

	if (!isLoading && listClusters.length === 0) {
		return (
			<EmptyMonitorFallback
				page="kubernetes"
				title={t("pages.kubernetes.fallback.title")}
				description={t("pages.kubernetes.fallback.description")}
				actionButtonText={t("pages.kubernetes.fallback.actionButton")}
				actionLink="/kubernetes/create"
			/>
		);
	}

	return (
		<BasePage
			loading={isLoading && listClusters.length === 0}
			error={error}
			headerKey="kubernetes"
		>
			<HeaderCreate
				path="/kubernetes/create"
				isLoading={isLoading}
				isAdmin={isAdmin}
			/>
			<KubernetesStatusBoxes summary={summary} />
			<TextField
				placeholder={t("pages.kubernetes.filters.search")}
				value={search}
				onChange={(event) => setSearch(event.target.value)}
			/>
			<ClusterTable
				clusters={listClusters}
				search={search}
				onOpen={(cluster) =>
					navigate(`/kubernetes/${encodeURIComponent(cluster.id)}`)
				}
			/>
		</BasePage>
	);
};

export default KubernetesMonitors;
