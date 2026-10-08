import { howItWorksSteps } from "../home-content";
import { SectionHeading } from "./section-heading";

export function HowItWorksSection() {
	return (
		<section
			className="scroll-mt-20 bg-brand-warm px-4 py-16 text-brand-warm-foreground md:px-6 md:py-20"
			id="como-funciona"
		>
			<div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start lg:gap-16">
				<SectionHeading
					eyebrow="Cómo funciona"
					title="Comprar entre muchos, sin el esfuerzo de coordinar."
				/>
				<ol className="flex flex-col gap-4">
					{howItWorksSteps.map((step, index) => (
						<li
							className="flex items-start gap-4 rounded-3xl bg-card p-5 text-card-foreground"
							key={step}
						>
							<span
								aria-hidden="true"
								className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-ink font-bold font-heading text-brand-ink-foreground"
							>
								{index + 1}
							</span>
							<p className="self-center text-base/relaxed">{step}</p>
						</li>
					))}
				</ol>
			</div>
		</section>
	);
}
