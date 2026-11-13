import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
	heroClosingLine,
	type WeeklyClosingSchedule,
} from "~/shared/common/weekly-closing";
import { heroCopy } from "../home-content";

export function HomeHero({ schedule }: { schedule: WeeklyClosingSchedule }) {
	return (
		<section className="bg-brand-ink text-brand-ink-foreground">
			<div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-7 px-4 py-12 md:px-6 md:py-20">
				<span className="rounded-full border border-brand-soft/30 px-4 py-1.5 font-medium text-brand-soft text-xs tracking-wide">
					Ushuaia · Tierra del Fuego
				</span>
				<div className="flex max-w-3xl flex-col gap-5">
					<h1 className="font-extrabold font-heading text-[clamp(40px,7vw,72px)] leading-tight tracking-tight">
						{heroCopy.title}
					</h1>
					<p className="text-brand-soft text-lg/relaxed sm:text-xl/relaxed">
						{heroCopy.lead}
					</p>
					<p className="font-medium text-base/relaxed sm:text-lg/relaxed">
						{heroClosingLine(schedule)}
					</p>
				</div>
				<div className="flex flex-col gap-3">
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
					<p className="text-center text-brand-ink-foreground/80 text-xs">
						{heroCopy.ctaNote}
					</p>
				</div>
			</div>
		</section>
	);
}
