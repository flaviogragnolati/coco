import { HouseIcon, WarehouseIcon } from "lucide-react";

const houses = [
	{ cx: 40, cy: 96, highlighted: false },
	{ cx: 88, cy: 96, highlighted: true },
	{ cx: 64, cy: 144, highlighted: false },
];

const flows = [
	{ from: 118, to: 162, y: 104, label: "Pedidos", labelY: 92 },
	{ from: 278, to: 338, y: 104, label: "Compra", labelY: 92 },
	{ from: 338, to: 278, y: 140, label: "Envío", labelY: 160 },
	{ from: 162, to: 96, y: 140, label: "Entrega", labelY: 160 },
];

function FlowArrow({ from, to, y, label, labelY }: (typeof flows)[number]) {
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
			<text
				className="fill-brand-soft-foreground"
				fontSize={11}
				textAnchor="middle"
				x={(from + to) / 2}
				y={labelY}
			>
				{label}
			</text>
		</g>
	);
}

export function HomeSystemIllustration() {
	return (
		<div className="rounded-4xl bg-brand-soft p-6 text-brand-soft-foreground shadow-xl sm:p-8">
			<svg
				aria-labelledby="home-system-illustration-title"
				className="h-auto w-full"
				role="img"
				viewBox="0 0 440 270"
			>
				<title id="home-system-illustration-title">
					Vecinos en distintas casas hacen su pedido; Coco junta los pedidos y
					le compra al proveedor; cuando llega la mercadería, Coco se la entrega
					a cada vecino.
				</title>
				{houses.map(({ cx, cy, highlighted }) => (
					<g key={`${cx}-${cy}`}>
						<circle
							className={highlighted ? "fill-highlight" : "fill-card"}
							cx={cx}
							cy={cy}
							r={22}
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
					className="fill-card"
					height={64}
					rx={16}
					width={64}
					x={348}
					y={88}
				/>
				<WarehouseIcon className="text-primary" size={30} x={365} y={105} />
				{flows.map((flow) => (
					<FlowArrow key={flow.label} {...flow} />
				))}
				<g
					className="fill-brand-soft-foreground font-heading font-semibold"
					fontSize={14}
					textAnchor="middle"
				>
					<text x={64} y={196}>
						Vecinos
					</text>
					<text x={220} y={196}>
						Coordina la compra
					</text>
					<text x={380} y={196}>
						Proveedor
					</text>
				</g>
				<g
					className="fill-brand-soft-foreground"
					fontSize={13}
					textAnchor="middle"
				>
					<text x={220} y={236}>
						Coco junta los pedidos de los vecinos, le compra al
					</text>
					<text x={220} y={254}>
						proveedor y reparte lo que llega.
					</text>
				</g>
			</svg>
		</div>
	);
}
