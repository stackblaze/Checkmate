import Box from "@mui/material/Box";

interface Props {
	size?: number;
	color?: string;
}

export const StackblazeMark = ({ size = 28, color = "#111" }: Props) => (
	<Box
		component="svg"
		viewBox="0 0 32 32"
		width={size}
		height={size}
		aria-hidden
		sx={{ display: "block", flexShrink: 0 }}
	>
		<path
			fill={color}
			d="M16 2.4 28.4 9.2v13.6L16 29.6 3.6 22.8V9.2L16 2.4z"
		/>
		<path
			fill="#fff"
			fillOpacity={0.22}
			d="M16 2.4 28.4 9.2 16 16 3.6 9.2 16 2.4z"
		/>
		<path
			fill="#000"
			fillOpacity={0.18}
			d="M16 16 28.4 9.2v13.6L16 29.6V16z"
		/>
	</Box>
);
