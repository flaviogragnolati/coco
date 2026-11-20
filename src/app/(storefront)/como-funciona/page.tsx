import { ArrowRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { HashSafeLink } from "~/components/hash-safe-link";
import { Button } from "~/components/ui/button";
import { FlowScene } from "~/features/home/_components/flow-scene";
import { HomeFooter } from "~/features/home/_components/home-footer";
import { OrderCalendar } from "~/features/home/_components/order-calendar";
import { SectionHeading } from "~/features/home/_components/section-heading";
import { StepNumber } from "~/features/home/_components/step-number";
import {
	getHowItWorksDetail,
	getOrderCalendarLegend,
	howItWorksIdea,
	howItWorksPage,
	orderCalendarLabel,
} from "~/features/home/how-it-works-detail";
import { getOrderCalendar } from "~/features/home/order-calendar";
import { getWeeklyClosingSchedule } from "~/server/services/weekly-closing/weekly-closing.service";
import { heroClosingLine } from "~/shared/common/weekly-closing";

export const metadata: Metadata = {
	title: "Cómo funciona | CoCo",
	description:
		"Cómo funciona una compra en CoCo, desde que armás tu pedido hasta que lo retirás o te lo llevamos.",
};

const wrap = "mx-auto w-full max-w-7xl";

export default async function HowItWorksPage() {
	const schedule = await getWeeklyClosingSchedule();
	const steps = getHowItWorksDetail(schedule);

	return (
		<main className="flex min-h-screen flex-col">
			<section className="bg-brand-ink px-4 py-10 text-brand-ink-foreground md:px-6 md:py-18">
				<div className={`${wrap} flex flex-col items-start gap-4`}>
					<nav
						aria-label="Ruta de navegación"
						className="text-brand-soft text-sm"
					>
						<ol className="flex gap-1.5">
							<li>
								<Link className="underline underline-offset-4" href="/">
									Inicio
								</Link>
							</li>
							<li aria-hidden="true">/</li>
							<li aria-current="page">Cómo funciona</li>
						</ol>
					</nav>
					<h1 className="max-w-[18ch] text-balance font-extrabold font-heading text-[clamp(36px,5.6vw,64px)] leading-none tracking-tight">
						{howItWorksPage.title}
					</h1>
					<p className="max-w-[60ch] text-base/relaxed sm:text-lg/relaxed">
						{howItWorksPage.lead}
					</p>
				</div>
			</section>

			<section className="px-4 py-14 md:px-6 md:py-20">
				<div
					className={`${wrap} grid items-start gap-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-16`}
				>
					<SectionHeading
						eyebrow="La idea"
						title="Por qué comprar juntos sale menos."
					/>
					<div className="flex max-w-[62ch] flex-col gap-3.5 text-base/relaxed">
						{howItWorksIdea.map((paragraph) => (
							<p key={paragraph}>{paragraph}</p>
						))}
					</div>
				</div>
			</section>

			<section
				className="scroll-mt-20 bg-brand-warm px-4 py-14 text-brand-warm-foreground md:px-6 md:py-20"
				id="calendario"
			>
				<div className={`${wrap} flex flex-col gap-8 md:gap-11`}>
					<SectionHeading
						eyebrow="El calendario"
						title="Un pedido, día por día."
					/>
					<OrderCalendar
						calendar={getOrderCalendar(schedule)}
						label={orderCalendarLabel(schedule)}
						legend={getOrderCalendarLegend(schedule)}
						stepTitles={steps.map((step) => step.title)}
					/>
				</div>
			</section>

			<section className="px-4 py-14 md:px-6 md:py-20">
				<div className={`${wrap} flex flex-col gap-4`}>
					<SectionHeading eyebrow="El detalle" title="Qué pasa en cada paso." />
					<ol className="flex flex-col">
						{steps.map((step, index) => (
							<li
								className="grid items-start gap-x-5 gap-y-4 border-t py-7 max-md:grid-cols-[2.75rem_minmax(0,1fr)] md:grid-cols-[2.75rem_minmax(0,16.25rem)_minmax(0,1fr)] md:gap-x-14 md:py-11"
								key={step.title}
							>
								<StepNumber
									last={index === steps.length - 1}
									step={index + 1}
								/>
								<FlowScene step={(index + 1) as 1 | 2 | 3 | 4} />
								<div className="flex max-w-[62ch] flex-col gap-3.5 text-base/relaxed max-md:col-start-2">
									<span className="font-bold text-muted-foreground text-xs uppercase leading-none tracking-widest">
										{step.when}
									</span>
									<h3 className="font-heading font-semibold text-2xl">
										{step.title}
									</h3>
									{step.paragraphs.map((paragraph) => (
										<p key={paragraph}>{paragraph}</p>
									))}
								</div>
							</li>
						))}
					</ol>
				</div>
			</section>

			<section className="bg-brand-ink px-4 py-14 text-brand-ink-foreground md:px-6 md:py-16">
				<div
					className={`${wrap} flex flex-wrap items-center justify-between gap-6`}
				>
					<div className="flex max-w-2xl flex-col gap-2">
						<h2 className="text-balance font-bold font-heading text-[clamp(24px,3vw,32px)] leading-tight tracking-tight">
							{heroClosingLine(schedule)}
						</h2>
						<p className="text-brand-soft">
							¿Te quedó alguna duda? Mirá las{" "}
							<HashSafeLink
								className="underline underline-offset-4"
								href="/#preguntas-frecuentes"
							>
								preguntas frecuentes
							</HashSafeLink>
							.
						</p>
					</div>
					<Button
						asChild
						className="rounded-full"
						size="lg"
						variant="highlight"
					>
						<Link href="/products">
							Ver el catálogo
							<ArrowRightIcon data-icon="inline-end" />
						</Link>
					</Button>
				</div>
			</section>

			<HomeFooter />
		</main>
	);
}
