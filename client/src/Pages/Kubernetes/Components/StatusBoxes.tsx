import {
	BreachedStatusBox,
	DownStatusBox,
	InitializingStatusBox,
	PausedStatusBox,
	UpStatusBox,
} from "@/Components/design-elements";
import type { StatusCounts } from "@/Utils/kubernetesClusters";
import Stack from "@mui/material/Stack";
import { useTheme } from "@mui/material/styles";

export const KubernetesStatusBoxes = ({ summary }: { summary: StatusCounts }) => {
	const theme = useTheme();
	return (
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
	);
};
