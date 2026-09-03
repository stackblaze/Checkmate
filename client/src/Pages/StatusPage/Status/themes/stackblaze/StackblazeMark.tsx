import Box from "@mui/material/Box";
import { useId } from "react";

interface Props {
	size?: number;
}

export const StackblazeMark = ({ size = 56 }: Props) => {
	const gradientId = useId().replace(/:/g, "");

	return (
		<Box
			component="svg"
			viewBox="108 213 48 78"
			width={size * (48 / 78)}
			height={size}
			aria-hidden
			sx={{ display: "block", flexShrink: 0 }}
		>
			<defs>
				<linearGradient
					id={gradientId}
					x1="132"
					y1="215"
					x2="132"
					y2="263"
					gradientUnits="userSpaceOnUse"
				>
					<stop
						offset="0%"
						stopColor="#FFD580"
					/>
					<stop
						offset="40%"
						stopColor="#FF8437"
					/>
					<stop
						offset="100%"
						stopColor="#FF4500"
					/>
				</linearGradient>
			</defs>
			<path
				d="m152.86 254.39v6.84l-20.49 12.26-19.52-11.68v-6.85l19.52 11.69z"
				fill="#c0200a"
			/>
			<path
				d="m152.86 265.29v6.84l-20.49 12.26-19.52-11.68v-6.85l19.52 11.69z"
				fill="#8f1506"
			/>
			<path
				d="m132.37 262.58l20.49-12.26c-0.75-2.96-2.04-5.84-3.86-8.48 2.86 10.86-14.97 12.87-10.67 0.87 3.26-9.1 11.52-11-5.61-27.32 0.16 10.08-2.67 16.29-5.47 20.18-5.09 7.07-10.43 6.99-13.93 14.25q-0.14 0.27-0.47 1.08z"
				fill={`url(#${gradientId})`}
			/>
		</Box>
	);
};
