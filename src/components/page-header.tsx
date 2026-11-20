import type { ReactNode } from "react";

import { Eyebrow } from "~/components/eyebrow";
import { cn } from "~/lib/utils";

/**
 * Page header: eyebrow + `h1` + description with an optional action slot on
 * the right. One per page — section-level headings use `SectionHeading`.
 * Both tones share the eyebrow; `tone="storefront"` adds the home's heading
 * scale, the default keeps the denser admin one.
 */
export function PageHeader({
	eyebrow,
	title,
	description,
	actions,
	tone = "default",
}: {
	eyebrow?: string;
	title: string;
	description?: string;
	actions?: ReactNode;
	tone?: "default" | "storefront";
}) {
	const storefront = tone === "storefront";
	return (
		<section className="flex flex-col gap-2">
			{eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
			<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
				<div className="flex max-w-3xl flex-col gap-2">
					<h1
						className={cn(
							"font-heading",
							storefront
								? "font-bold text-[clamp(28px,4vw,40px)] leading-tight tracking-tight"
								: "font-semibold text-3xl tracking-normal",
						)}
					>
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
