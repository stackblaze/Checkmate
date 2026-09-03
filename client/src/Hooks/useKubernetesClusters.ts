import { useGet } from "@/Hooks/UseApi";
import type { Monitor } from "@/Types/Monitor";
import type { Tag } from "@/Types/Tag";
import {
	clusterSummary,
	groupClustersByRegion,
	groupKubernetesClusters,
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
	const regions = useMemo(() => groupClustersByRegion(clusters), [clusters]);
	const summary = useMemo(() => clusterSummary(clusters), [clusters]);

	return { clusters, regions, summary, isLoading, error, refetch };
};
