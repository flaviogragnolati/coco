import { GraduationCapIcon, XIcon } from "lucide-react";

import { Button } from "~/components/ui/button";

/** Stands where the announcement bar does, and above the spotlight backdrop. */
export function TutorialModeBar({ onExit }: { onExit: () => void }) {
	return (
		<div className="pointer-events-auto relative z-[65] flex items-center justify-center gap-3 bg-brand-ink px-4 py-1.5 text-brand-soft text-xs">
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
