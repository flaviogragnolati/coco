import { cn } from "~/lib/utils";
import type { TrackingJourneyStepperStage } from "./tracking-journey-stepper";

/**
 * The customer's six-stage track: done stages in ink, the current one in
 * orange, the rest in grey. On a phone only the first, the current and the
 * last labels show. The admin keeps `TrackingJourneyStepper`.
 */
export function OrderJourneyTrack({
	stages,
	caption,
	className,
}: {
	stages: TrackingJourneyStepperStage[];
	caption?: string | null;
	className?: string;
}) {
	const lastIndex = stages.length - 1;

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			<ol
				aria-label="Seguimiento del pedido"
				className="grid"
				style={{
					gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))`,
				}}
			>
				{stages.map((stage, index) => {
					const done = stage.status === "completed";
					const current = stage.status === "current";
					const reached = done || current;
					const keepLabel = current || index === 0 || index === lastIndex;

					return (
						<li
							aria-current={current ? "step" : undefined}
							className="relative flex flex-col items-center gap-2 pt-7 text-center"
							key={stage.key}
						>
							{index > 0 ? (
								<span
									aria-hidden="true"
									className={cn(
										"absolute top-[7px] right-1/2 h-1 w-full",
										reached ? "bg-brand-ink dark:bg-brand-soft" : "bg-border",
									)}
								/>
							) : null}
							<span
								aria-hidden="true"
								className={cn(
									"absolute top-0 left-1/2 z-10 size-[18px] -translate-x-1/2 rounded-full border-[3px]",
									current
										? "border-highlight bg-highlight ring-4 ring-highlight/25"
										: done
											? "border-brand-ink bg-brand-ink dark:border-brand-soft dark:bg-brand-soft"
											: "border-border bg-card",
								)}
							/>
							<span
								className={cn(
									"text-xs leading-tight",
									current
										? "font-bold text-foreground"
										: done
											? "text-foreground"
											: "text-muted-foreground",
									!keepLabel && "sr-only sm:not-sr-only",
								)}
							>
								{stage.label}
								<span className="sr-only">
									{current ? " (etapa actual)" : done ? " (hecha)" : ""}
								</span>
							</span>
						</li>
					);
				})}
			</ol>
			{caption ? <p className="text-sm">{caption}</p> : null}
		</div>
	);
}
