import { GraduationCapIcon, XIcon } from "lucide-react";

import { Button } from "~/components/ui/button";

/**
 * Classes for a side sheet a scene shows open: it starts below this bar, which
 * sits above the sheet (z-[65] against z-50) so "Salir del tutorial" is always
 * reachable. Keep `top-9` equal to the bar's `h-9`.
 */
export const BELOW_TUTORIAL_BAR = "top-9 bottom-0 h-auto";

/** Stands where the announcement bar does, and above the spotlight backdrop. */
export function TutorialModeBar({ onExit }: { onExit: () => void }) {
	return (
		<div className="pointer-events-auto relative z-[65] flex h-9 items-center justify-center gap-3 bg-brand-ink px-4 text-brand-soft text-xs">
			<span className="flex items-center gap-1.5">
				<GraduationCapIcon aria-hidden="true" className="size-3.5" />
				Modo tutorial · datos de ejemplo
			</span>
			<Button
				className="h-6 rounded-full px-2 text-brand-soft hover:bg-white/10 hover:text-brand-ink-foreground"
				onClick={onExit}
				size="xs"
				type="button"
				variant="ghost"
			>
				<XIcon data-icon="inline-start" />
				Salir del tutorial
			</Button>
		</div>
	);
}
