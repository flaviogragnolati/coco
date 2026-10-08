import { HouseIcon, WarehouseIcon } from "lucide-react";

// Node centers sit at 1/6, 3/6 and 5/6 of the width so the HTML labels below,
// laid out in three equal columns, line up with them at any size.
const houses = [
	{ cx: 49, cy: 96, highlighted: false },
	{ cx: 97, cy: 96, highlighted: true },
	{ cx: 73, cy: 144, highlighted: false },
];

const flows = [
	{ from: 127, to: 164, y: 104 },
	{ from: 278, to: 327, y: 104 },
	{ from: 327, to: 278, y: 140 },
	{ from: 164, to: 103, y: 140 },
];

const nodeLabels = ["Vecinos", "Coordina la compra", "Proveedor"];

function FlowArrow({ from, to, y }: (typeof flows)[number]) {
	const direction = Math.sign(to - from);
	const tip = `${to},${y} ${to - direction * 8},${y - 5} ${to - direction * 8},${y + 5}`;
	return (
		<g>
			<line
				className="stroke-brand-soft-foreground"
				strokeLinecap="round"
				strokeWidth={2}
				x1={from}
				x2={to - direction * 6}
				y1={y}
				y2={y}
			/>
			<polygon className="fill-brand-soft-foreground" points={tip} />
		</g>
	);
}

export function HomeSystemIllustration() {
	return (
		<figure className="rounded-4xl bg-brand-soft p-5 text-brand-soft-foreground shadow-xl sm:p-8">
			<svg
				aria-labelledby="home-system-illustration-title"
				className="h-auto w-full"
				role="img"
				viewBox="0 60 440 120"
			>
				<title id="home-system-illustration-title">
					Vecinos en distintas casas hacen su pedido; Coco junta los pedidos y
					le compra al proveedor; cuando llega la mercadería, Coco se la entrega
					a cada vecino.
				</title>
				{houses.map(({ cx, cy, highlighted }) => (
					<g key={`${cx}-${cy}`}>
						<circle
							className={
								highlighted
									? "fill-highlight"
									: "fill-card stroke-brand-soft-foreground/40"
							}
							cx={cx}
							cy={cy}
							r={22}
							strokeWidth={1.5}
						/>
						<HouseIcon
							className={
								highlighted ? "text-highlight-foreground" : "text-primary"
							}
							size={22}
							x={cx - 11}
							y={cy - 11}
						/>
					</g>
				))}
				<circle className="fill-brand-ink" cx={220} cy={120} r={50} />
				<text
					className="fill-brand-ink-foreground font-bold font-heading"
					fontSize={28}
					textAnchor="middle"
					x={220}
					y={129}
				>
					coco
				</text>
				<rect
					className="fill-card stroke-brand-soft-foreground/40"
					height={64}
					rx={16}
					strokeWidth={1.5}
					width={64}
					x={335}
					y={88}
				/>
				<WarehouseIcon className="text-primary" size={30} x={352} y={105} />
				{flows.map((flow) => (
					<FlowArrow key={`${flow.from}-${flow.to}`} {...flow} />
				))}
			</svg>
			<div
				aria-hidden="true"
				className="mt-3 grid grid-cols-3 gap-2 text-center font-heading font-semibold text-sm sm:text-base"
			>
				{nodeLabels.map((label) => (
					<span key={label}>{label}</span>
				))}
			</div>
			<figcaption className="mt-5 text-center text-sm/relaxed sm:text-base/relaxed">
				Coco junta los pedidos de los vecinos, le compra al proveedor y reparte
				lo que llega.
			</figcaption>
		</figure>
	);
}
