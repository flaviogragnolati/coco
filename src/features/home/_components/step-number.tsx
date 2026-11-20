import { cn } from "~/lib/utils";

/** A step's number on the Cómo funciona timeline; the last one is highlighted. */
export function StepNumber({ step, last }: { step: number; last: boolean }) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"relative grid size-11 shrink-0 place-items-center rounded-full font-bold font-heading text-lg",
				last
					? "bg-highlight text-highlight-foreground"
					: "bg-brand-ink text-brand-ink-foreground",
			)}
		>
			{step}
		</span>
	);
}
