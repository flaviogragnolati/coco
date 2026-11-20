import { type ReactNode, useId } from "react";

import { cn } from "~/lib/utils";
import {
	formatDeliveryLeadTime,
	type WeeklyClosingSchedule,
} from "~/shared/common/weekly-closing";

/**
 * The truck's route as the FAQ tells it ("¿Cuánto tarda en llegar mi
 * compra?"); change both together.
 */
const stops: {
	name: string;
	note: string;
	icon: ReactNode;
	/** The leg to the next stop crosses water. */
	water?: boolean;
}[] = [
	{
		name: "Buenos Aires",
		note: "Una sola compra grande",
		icon: (
			<>
				<path d="M3 21V9l9-5 9 5v12" />
				<path d="M8 21v-7h8v7M8 17.5h8" />
			</>
		),
	},
	{
		name: "Cruce a Chile",
		note: "El camión sale de la Argentina",
		icon: (
			<>
				<path d="M5 21V7M3 21h4" />
				<path d="M5 10l15-4M10 8.7v2.4M15 7.3v2.4" />
			</>
		),
	},
	{
		name: "Estrecho de Magallanes",
		note: "Cruza en balsa",
		icon: (
			<>
				<path d="M4 13h16l-2 4H6z" />
				<path d="M8 13V9h8v4" />
				<path d="M3 21c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1" />
			</>
		),
		water: true,
	},
	{
		name: "Cordillera",
		note: "Vuelve a entrar y la cruza",
		icon: (
			<>
				<path d="M2 20l7-12 4 7 2-3 7 8z" />
				<path d="M7.4 10.8l1.6 1.4 1.5-1.2" />
			</>
		),
	},
	{
		name: "Ushuaia",
		note: "Retirás o te lo llevamos",
		icon: (
			<>
				<path d="M3 11l9-7 9 7" />
				<path d="M5 10v10h14V10" />
				<path d="M10 20v-5h4v5" />
			</>
		),
	},
];

function WaterLeg() {
	const patternId = useId();
	return (
		<svg
			aria-hidden="true"
			className="absolute top-5.5 left-1/2 hidden h-2 w-full text-brand-soft/55 md:block"
		>
			<defs>
				<pattern
					height="8"
					id={patternId}
					patternUnits="userSpaceOnUse"
					width="24"
				>
					<path
						d="M0 4c3-4 9-4 12 0s9 4 12 0"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					/>
				</pattern>
			</defs>
			<rect fill={`url(#${patternId})`} height="100%" width="100%" />
		</svg>
	);
}

export function RouteDiagram({
	schedule,
}: {
	schedule: WeeklyClosingSchedule;
}) {
	return (
		<figure className="border-brand-ink-muted border-t pt-7">
			<figcaption className="mb-7 flex flex-wrap justify-between gap-2 text-brand-soft text-sm">
				<span className="font-heading font-semibold text-base text-brand-ink-foreground">
					El viaje de tu pedido
				</span>
				<span>{formatDeliveryLeadTime(schedule)} desde el cierre</span>
			</figcaption>
			<div className="relative">
				{/* route-travel spans 10%–90%: the centres of five equal columns. */}
				<span
					aria-hidden="true"
					className="absolute top-5 left-[10%] z-1 -ml-1.5 hidden size-3 animate-route-travel rounded-full bg-highlight md:block"
				/>
				<ol className="grid md:grid-cols-5">
					{stops.map((stop, index) => {
						const last = index === stops.length - 1;
						return (
							<li
								className="relative min-h-21 pb-5 pl-18 md:min-h-0 md:px-2 md:pt-17 md:pb-0 md:text-center"
								key={stop.name}
							>
								{last ? null : (
									<>
										<span
											aria-hidden="true"
											className={cn(
												"absolute top-6.5 left-6 h-full border-brand-soft/55 border-l-2 border-dashed md:top-6 md:left-1/2 md:h-0 md:w-full md:border-t-2 md:border-l-0",
												stop.water && "md:hidden",
											)}
										/>
										{stop.water ? <WaterLeg /> : null}
									</>
								)}
								<span
									aria-hidden="true"
									className={cn(
										"absolute top-0 left-0 z-2 grid size-13 place-items-center rounded-full border-[1.5px] md:left-1/2 md:-translate-x-1/2",
										last
											? "border-highlight bg-highlight text-highlight-foreground"
											: "border-brand-soft/45 bg-brand-ink text-brand-soft",
									)}
								>
									<svg
										aria-hidden="true"
										className="size-6"
										fill="none"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="1.75"
										viewBox="0 0 24 24"
									>
										{stop.icon}
									</svg>
								</span>
								<span className="block font-heading font-semibold text-base leading-tight">
									{stop.name}
								</span>
								<span className="mt-1 block text-brand-soft text-sm/snug">
									{stop.note}
								</span>
							</li>
						);
					})}
				</ol>
			</div>
		</figure>
	);
}
