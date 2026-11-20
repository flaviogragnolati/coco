import { type ReactNode, useId } from "react";

import { cn } from "~/lib/utils";

type Step = 1 | 2 | 3 | 4;

const labels: Record<Step, string> = {
	1: "Tu pedido se suma al de otros vecinos",
	2: "CoCo junta los pedidos y hace una sola compra",
	3: "La compra viaja de Buenos Aires a Ushuaia y cruza el Estrecho en balsa",
	4: "Lo que llega se reparte a cada vecino",
};

const stroke = {
	strokeWidth: 1.75,
	strokeLinecap: "round",
	strokeLinejoin: "round",
} as const;

function Line({
	d,
	arrow,
	dim = false,
	dashed = false,
}: {
	d: string;
	/** The marker's url, for a line that ends in an arrowhead. */
	arrow?: string;
	dim?: boolean;
	dashed?: boolean;
}) {
	return (
		<path
			{...stroke}
			className={cn("fill-none stroke-brand-ink", dim && "opacity-30")}
			d={d}
			markerEnd={arrow}
			strokeDasharray={dashed ? "2 6" : undefined}
		/>
	);
}

function Box({
	x,
	y,
	width,
	height,
	rx,
	fill = "card",
}: {
	x: number;
	y: number;
	width: number;
	height: number;
	rx: number;
	fill?: "card" | "highlight" | "soft";
}) {
	return (
		<rect
			{...stroke}
			className={cn(
				"stroke-brand-ink",
				fill === "card" && "fill-card",
				fill === "highlight" && "fill-highlight",
				fill === "soft" && "fill-brand-soft",
			)}
			height={height}
			rx={rx}
			width={width}
			x={x}
			y={y}
		/>
	);
}

function OrderLabel({ x, y }: { x: number; y: number }) {
	return (
		<text
			className="fill-highlight-foreground font-heading font-semibold text-[11px]"
			x={x}
			y={y}
		>
			Tu pedido
		</text>
	);
}

function Caption({
	x,
	y,
	children,
	anchor,
}: {
	x: number;
	y: number;
	children: ReactNode;
	anchor?: "middle" | "end";
}) {
	return (
		<text
			className="fill-current font-semibold text-[10px] opacity-75"
			textAnchor={anchor}
			x={x}
			y={y}
		>
			{children}
		</text>
	);
}

/** Three stacked parcels, the single purchase. */
function Parcels({
	x,
	y,
	width,
	height,
}: {
	x: number;
	y: number;
	width: number;
	height: number;
}) {
	const parcel = { fill: "soft", height, rx: 3, width } as const;
	return (
		<>
			<Box {...parcel} x={x} y={y} />
			<Box {...parcel} x={x + width} y={y} />
			<Box {...parcel} x={x + width / 2} y={y - height} />
		</>
	);
}

/** One neighbour's order and the two beside it. */
function Orders({ x, highlightX }: { x: number; highlightX: number }) {
	return (
		<>
			<Box height={24} rx={6} width={92} x={x} y={6} />
			<Line d={`M${x + 10} 18h44`} dim />
			<Box
				fill="highlight"
				height={24}
				rx={6}
				width={92}
				x={highlightX}
				y={38}
			/>
			<OrderLabel x={highlightX + 12} y={54} />
			<Box height={24} rx={6} width={92} x={x} y={70} />
			<Line d={`M${x + 10} 82h56`} dim />
		</>
	);
}

/** One scene of "many orders, one purchase", drawn over each step. */
export function FlowScene({ step }: { step: Step }) {
	const markerId = useId();
	const arrow = `url(#${markerId})`;

	let body: ReactNode;
	switch (step) {
		case 1:
			body = (
				<>
					<Orders highlightX={30} x={16} />
					<Line arrow={arrow} d="M112 18C156 18 166 42 204 47" />
					<Line arrow={arrow} d="M126 50H204" />
					<Line arrow={arrow} d="M112 82C156 82 166 58 204 53" />
				</>
			);
			break;
		case 2:
			body = (
				<>
					<circle className="fill-brand-ink" cx={60} cy={50} r={34} />
					<text
						className="fill-brand-ink-foreground font-extrabold font-heading text-[20px] tracking-tighter"
						textAnchor="middle"
						x={60}
						y={57}
					>
						coco
					</text>
					<Line arrow={arrow} d="M100 50H146" />
					<Caption anchor="middle" x={123} y={41}>
						1 compra
					</Caption>
					<Parcels height={34} width={36} x={156} y={50} />
				</>
			);
			break;
		case 3:
			body = (
				<>
					<Line d="M10 76H88" dashed />
					<Line d="M88 76c5-7 15-7 20 0s15 7 20 0 15-7 20 0" />
					<Line arrow={arrow} d="M148 76H226" dashed />
					<Parcels height={22} width={24} x={94} y={40} />
					<Caption x={10} y={94}>
						Buenos Aires
					</Caption>
					<Caption anchor="end" x={230} y={94}>
						Ushuaia
					</Caption>
				</>
			);
			break;
		case 4:
			body = (
				<>
					<Parcels height={34} width={36} x={12} y={50} />
					<Line arrow={arrow} d="M92 47C112 44 112 18 128 18" />
					<Line arrow={arrow} d="M92 50H114" />
					<Line arrow={arrow} d="M92 53C112 56 112 82 128 82" />
					<Orders highlightX={118} x={132} />
				</>
			);
			break;
	}

	return (
		<svg
			aria-label={labels[step]}
			className="h-auto w-full max-w-70"
			role="img"
			viewBox="0 0 240 100"
		>
			<defs>
				<marker
					id={markerId}
					markerHeight="6"
					markerWidth="6"
					orient="auto"
					refX="8"
					refY="5"
					viewBox="0 0 10 10"
				>
					<path className="fill-brand-ink" d="M1 1l8 4-8 4z" />
				</marker>
			</defs>
			{body}
		</svg>
	);
}
