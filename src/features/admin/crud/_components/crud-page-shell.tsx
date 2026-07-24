import type { ReactNode } from "react";

export function CrudPageShell({
	title,
	description,
	actions,
	children,
}: {
	title: string;
	description?: string;
	actions?: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className="flex w-full flex-col gap-5">
			<header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
				<div className="flex min-w-0 flex-col gap-1">
					<h1 className="font-heading font-semibold text-2xl tracking-normal">
						{title}
					</h1>
					{description ? (
						<p className="max-w-3xl text-muted-foreground text-xs/relaxed">
							{description}
						</p>
					) : null}
				</div>
				{actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
			</header>
			{children}
		</div>
	);
}
