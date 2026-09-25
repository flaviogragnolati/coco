import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { problemSolutionCards } from "../home-content";

export function ProblemSolutionSection() {
	return (
		<section
			className="scroll-mt-20 bg-brand-warm px-4 py-16 text-brand-warm-foreground md:px-6 md:py-20"
			id="como-funciona"
		>
			<div className="mx-auto flex max-w-7xl flex-col gap-10">
				<div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
					<Badge variant="highlight">Cómo lo resuelve coco</Badge>
					<h2 className="text-balance font-bold font-heading text-3xl sm:text-4xl">
						Comprar entre muchos, sin el esfuerzo de coordinar.
					</h2>
				</div>
				<div className="grid gap-5 md:grid-cols-3">
					{problemSolutionCards.map(({ title, description, Icon }, index) => (
						<div
							className={cn(
								"flex flex-col gap-4 rounded-3xl p-7",
								index === 1
									? "bg-brand-ink text-brand-ink-foreground"
									: "bg-card text-card-foreground",
							)}
							key={title}
						>
							<Icon aria-hidden="true" className="size-7" />
							<h3 className="font-bold font-heading text-2xl">{title}</h3>
							<p className="text-base/relaxed">{description}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
