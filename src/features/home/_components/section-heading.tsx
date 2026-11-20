import type { ReactNode } from "react";

import { Eyebrow } from "~/components/eyebrow";

export function SectionHeading({
	eyebrow,
	title,
	description,
	actions,
}: {
	eyebrow: string;
	title: string;
	description?: string;
	actions?: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
			<div className="flex max-w-3xl flex-col gap-3">
				<Eyebrow>{eyebrow}</Eyebrow>
				<div className="flex flex-col gap-2">
					<h2 className="text-balance font-bold font-heading text-[clamp(28px,4vw,44px)] leading-[1.08] tracking-tight">
						{title}
					</h2>
					{description ? (
						<p className="text-muted-foreground text-sm/relaxed">
							{description}
						</p>
					) : null}
				</div>
			</div>
			{actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
		</div>
	);
}
