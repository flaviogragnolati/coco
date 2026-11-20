import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { WeeklyClosingSchedule } from "~/shared/common/weekly-closing";
import { getHowItWorksSteps } from "../home-content";
import { FlowScene } from "./flow-scene";
import { SectionHeading } from "./section-heading";
import { StepNumber } from "./step-number";

const rail = "bg-brand-warm-foreground/20";

export function HowItWorksSection({
	schedule,
}: {
	schedule: WeeklyClosingSchedule;
}) {
	const steps = getHowItWorksSteps(schedule);
	return (
		<section
			className="scroll-mt-20 bg-brand-warm px-4 py-16 text-brand-warm-foreground md:px-6 md:py-20"
			id="como-funciona"
		>
			<div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-10">
				<SectionHeading
					eyebrow="Cómo funciona"
					title="Comprar entre muchos, sin el esfuerzo de coordinar."
				/>
				<ol className="grid w-full gap-8 lg:grid-cols-4 lg:gap-0">
					{steps.map((step, index) => {
						const last = index === steps.length - 1;
						return (
							<li
								className="relative grid content-start gap-2.5 pl-16 lg:pr-6 lg:pl-0"
								key={step.title}
							>
								{last ? null : (
									<span
										aria-hidden="true"
										className={cn(
											"absolute top-0 left-5.25 h-[calc(100%+2rem)] w-0.5 lg:hidden",
											rail,
										)}
									/>
								)}
								<FlowScene step={(index + 1) as 1 | 2 | 3 | 4} />
								<div className="absolute top-0 left-0 lg:relative lg:my-2">
									{last ? null : (
										<span
											aria-hidden="true"
											className={cn(
												"absolute top-1/2 -right-6 left-0 -mt-px hidden h-0.5 lg:block",
												rail,
											)}
										/>
									)}
									<StepNumber last={last} step={index + 1} />
								</div>
								<span className="font-bold text-brand-warm-foreground/70 text-xs uppercase leading-none tracking-widest">
									{step.when}
								</span>
								<h3 className="font-heading font-semibold text-xl">
									{step.title}
								</h3>
								<p className="max-w-[30ch] text-base/relaxed">{step.body}</p>
							</li>
						);
					})}
				</ol>
				<p className="max-w-2xl text-base/relaxed">
					CoCo junta los pedidos de los vecinos, le compra al proveedor y
					reparte lo que llega.
				</p>
				<Button asChild variant="outline">
					<Link href="/como-funciona">
						Ver cómo funciona en detalle
						<ArrowRightIcon data-icon="inline-end" />
					</Link>
				</Button>
			</div>
		</section>
	);
}
