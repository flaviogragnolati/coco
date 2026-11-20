import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

/** Section label shared by the storefront and the admin. Takes the text colour of its container. */
export function Eyebrow({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-2.5 font-bold text-xs uppercase tracking-[0.12em]",
				className,
			)}
		>
			<span
				aria-hidden="true"
				className="size-2 shrink-0 rounded-full bg-highlight ring-4 ring-highlight/25"
			/>
			{children}
		</span>
	);
}
