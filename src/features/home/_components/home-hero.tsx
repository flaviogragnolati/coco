import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { Eyebrow } from "~/components/eyebrow";
import { Button } from "~/components/ui/button";
import {
	heroClosingLine,
	type WeeklyClosingSchedule,
} from "~/shared/common/weekly-closing";
import { heroCopy } from "../home-content";
import { HeroClosingTimer } from "./hero-closing-timer";
import { RouteDiagram } from "./route-diagram";

const titleStart = heroCopy.title.slice(0, -heroCopy.titleAccent.length);

export function HomeHero({ schedule }: { schedule: WeeklyClosingSchedule }) {
	return (
		<section className="bg-brand-ink text-brand-ink-foreground">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pt-12 pb-9 md:gap-16 md:px-6 md:pt-20 md:pb-14">
				<div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-x-12">
					<div className="flex max-w-3xl flex-col items-start gap-5">
						<Eyebrow className="text-brand-soft">
							Ushuaia · Tierra del Fuego
						</Eyebrow>
						<h1 className="text-balance font-extrabold font-heading text-[clamp(42px,7.4vw,84px)] leading-[0.98] tracking-tight">
							{titleStart}
							<span className="text-highlight">{heroCopy.titleAccent}</span>
						</h1>
						<p className="max-w-[56ch] text-brand-soft text-lg/relaxed sm:text-xl/relaxed">
							{heroCopy.lead}
						</p>
						<p className="font-semibold text-base/relaxed sm:text-lg/relaxed">
							{heroClosingLine(schedule)}
						</p>
						<div className="flex flex-wrap items-center gap-x-4 gap-y-3">
							<Button
								asChild
								className="rounded-full"
								size="lg"
								variant="highlight"
							>
								<Link href="/products">
									{heroCopy.cta}
									<ArrowRightIcon data-icon="inline-end" />
								</Link>
							</Button>
							<p className="text-brand-ink-foreground/75 text-sm">
								{heroCopy.ctaNote}
							</p>
						</div>
					</div>
					<HeroClosingTimer />
				</div>
				<RouteDiagram schedule={schedule} />
			</div>
		</section>
	);
}
