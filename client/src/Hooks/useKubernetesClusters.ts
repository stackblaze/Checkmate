import { useGet } from "@/Hooks/UseApi";
import type { Monitor } from "@/Types/Monitor";
import type { Tag } from "@/Types/Tag";
import {
	clusterSummary,
	groupKubernetesClusters,
	isListCluster,
} from "@/Utils/kubernetesClusters";
import { useMemo } from "react";

const MONITORS_URL = "/monitors/team?type=http&type=hardware";

export const useKubernetesClusters = () => {
	const { data: monitors, isLoading, error, refetch } = useGet<Monitor[]>(
		MONITORS_URL,
		{},
		{ refreshInterval: 10000, keepPreviousData: true }
	);
	const { data: tags } = useGet<Tag[]>("/tags/team");

	const clusters = useMemo(
		() => groupKubernetesClusters(monitors ?? [], tags ?? []),
		[monitors, tags]
	);
	const listClusters = useMemo(() => clusters.filter(isListCluster), [clusters]);
	const summary = useMemo(() => clusterSummary(listClusters), [listClusters]);

	return { clusters, listClusters, summary, isLoading, error, refetch };
};
