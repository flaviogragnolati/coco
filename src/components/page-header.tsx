import type { ReactNode } from "react";

/**
 * Storefront page header: eyebrow + `h1` + description with an optional action
 * slot on the right. One per page — section-level headings use
 * `SectionHeading` (an `h2` with a Badge eyebrow) instead.
 */
export function PageHeader({
	eyebrow,
	title,
	description,
	actions,
}: {
	eyebrow?: string;
	title: string;
	description?: string;
	actions?: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-2">
			{eyebrow ? (
				<span className="font-semibold text-highlight text-xs uppercase tracking-wide">
					{eyebrow}
				</span>
			) : null}
			<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
				<div className="flex max-w-3xl flex-col gap-2">
					<h1 className="font-heading font-semibold text-3xl tracking-normal">
						{title}
					</h1>
					{description ? (
						<p className="text-muted-foreground text-sm/relaxed">
							{description}
						</p>
					) : null}
				</div>
				{actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
			</div>
		</section>
	);
}
