import {
	BasePage,
	BreachedStatusBox,
	DownStatusBox,
	EmptyMonitorFallback,
	InitializingStatusBox,
	PausedStatusBox,
	UpStatusBox,
} from "@/Components/design-elements";
import { TextField } from "@/Components/inputs";
import { useKubernetesClusters } from "@/Hooks/useKubernetesClusters";
import { ClustersByRegion } from "@/Pages/Kubernetes/Monitors/Components/ClustersByRegion";
import Stack from "@mui/material/Stack";
import { useTheme } from "@mui/material/styles";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const KubernetesMonitors = () => {
	const { t } = useTranslation();
	const theme = useTheme();
	const { clusters, regions, summary, isLoading, error } = useKubernetesClusters();
	const [search, setSearch] = useState("");

	if (error && clusters.length === 0) {
		return (
			<BasePage
				error={error}
				headerKey="kubernetes"
			>
				{null}
			</BasePage>
		);
	}

	if (!isLoading && clusters.length === 0) {
		return (
			<EmptyMonitorFallback
				page="kubernetes"
				title={t("pages.kubernetes.fallback.title")}
				description={t("pages.kubernetes.fallback.description")}
				actionButtonText=""
				actionLink=""
			/>
		);
	}

	return (
		<BasePage
			loading={isLoading && clusters.length === 0}
			error={error}
			headerKey="kubernetes"
		>
			<Stack
				direction={{ xs: "column", md: "row" }}
				gap={theme.spacing(8)}
			>
				<UpStatusBox n={summary.up} />
				<DownStatusBox n={summary.down} />
				<BreachedStatusBox n={summary.breached} />
				<PausedStatusBox n={summary.paused} />
				<InitializingStatusBox n={summary.initializing} />
			</Stack>
			<TextField
				placeholder={t("pages.kubernetes.filters.search")}
				value={search}
				onChange={(event) => setSearch(event.target.value)}
			/>
			<ClustersByRegion
				regions={regions}
				search={search}
			/>
		</BasePage>
	);
};

export default KubernetesMonitors;
