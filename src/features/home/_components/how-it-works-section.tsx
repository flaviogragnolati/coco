import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import { howItWorksSteps } from "../home-content";
import { SectionHeading } from "./section-heading";

export function HowItWorksSection() {
	return (
		<section
			className="scroll-mt-20 bg-brand-soft px-4 py-16 text-brand-soft-foreground md:px-6 md:py-20"
			id="como-funciona"
		>
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-10">
				<SectionHeading
					actions={
						<Button asChild variant="outline">
							<Link href="#preguntas-frecuentes">
								Ver preguntas frecuentes
								<ArrowRightIcon data-icon="inline-end" />
							</Link>
						</Button>
					}
					description="Tres etapas claras, desde que elegís un producto hasta que recibís tu compra."
					eyebrow="Cómo funciona"
					title="Vos elegís. Coco ordena el camino."
				/>
				<ol className="grid gap-8 md:grid-cols-3 md:gap-0">
					{howItWorksSteps.map(({ title, description, Icon }, index) => (
						<li
							className="relative flex gap-4 md:flex-col md:gap-5 md:pr-10"
							key={title}
						>
							{index < howItWorksSteps.length - 1 ? (
								<div
									aria-hidden="true"
									className="absolute top-12 bottom-[-2rem] left-6 w-px bg-primary/30 md:top-6 md:right-0 md:bottom-auto md:left-12 md:h-px md:w-[calc(100%-3rem)]"
								/>
							) : null}
							<div className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
								<Icon aria-hidden="true" />
								<span className="sr-only">Paso {index + 1}</span>
							</div>
							<div className="flex flex-col gap-2">
								<span className="font-semibold text-primary text-xs uppercase tracking-wide">
									Paso {index + 1}
								</span>
								<h3 className="font-heading font-semibold text-xl">{title}</h3>
								<p className="text-sm/relaxed opacity-75">{description}</p>
							</div>
						</li>
					))}
				</ol>
			</div>
		</section>
	);
}
