"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { PageHeader } from "~/components/page-header";
import { findAdminNavItem } from "~/features/admin/shell/admin-nav";

/**
 * Standalone admin page frame. The eyebrow defaults to the nav group that owns
 * the current route ("Operación" on `/admin/lots`), so every admin page carries
 * the same header language as the storefront without per-page wiring.
 */
export function CrudPageShell({
	title,
	description,
	actions,
	eyebrow,
	children,
}: {
	title: string;
	description?: string;
	actions?: ReactNode;
	eyebrow?: string;
	children: ReactNode;
}) {
	const pathname = usePathname();
	const resolvedEyebrow =
		eyebrow ?? findAdminNavItem(pathname ?? "")?.group?.label;

	return (
		<div className="flex w-full flex-col gap-5">
			<PageHeader
				actions={actions}
				description={description}
				eyebrow={resolvedEyebrow}
				title={title}
			/>
			{children}
		</div>
	);
}
