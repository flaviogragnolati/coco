import type { ReactNode } from "react";

import { Badge } from "~/components/ui/badge";

export function SectionHeading({
	eyebrow,
	title,
	description,
	actions,
}: {
	eyebrow: string;
	title: string;
	description: string;
	actions?: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
			<div className="flex max-w-3xl flex-col gap-3">
				<Badge className="w-fit" variant="secondary">
					{eyebrow}
				</Badge>
				<div className="flex flex-col gap-2">
					<h2 className="font-heading font-semibold text-2xl tracking-normal">
						{title}
					</h2>
					<p className="text-muted-foreground text-sm/relaxed">{description}</p>
				</div>
			</div>
			{actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
		</div>
	);
}
