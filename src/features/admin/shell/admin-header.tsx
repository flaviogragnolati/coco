"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Separator } from "~/components/ui/separator";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { adminHome, findAdminNavItem } from "./admin-nav";

export function AdminHeader() {
	const pathname = usePathname();
	const match = findAdminNavItem(pathname);
	const isHome = match?.item.href === adminHome.href;

	// Groups have no URL of their own, so they render as plain text crumbs.
	const trail = isHome
		? []
		: [match?.group?.label, match?.item.title].filter(
				(label): label is string => Boolean(label),
			);

	return (
		<header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur">
			<SidebarTrigger />
			<Separator
				className="mr-1 data-[orientation=vertical]:h-4"
				orientation="vertical"
			/>
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						{isHome || trail.length === 0 ? (
							<BreadcrumbPage>{adminHome.title}</BreadcrumbPage>
						) : (
							<BreadcrumbLink asChild>
								<Link href={adminHome.href}>{adminHome.title}</Link>
							</BreadcrumbLink>
						)}
					</BreadcrumbItem>
					{trail.map((label, index) => (
						<Fragment key={label}>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								{index === trail.length - 1 ? (
									<BreadcrumbPage>{label}</BreadcrumbPage>
								) : (
									<span>{label}</span>
								)}
							</BreadcrumbItem>
						</Fragment>
					))}
				</BreadcrumbList>
			</Breadcrumb>
		</header>
	);
}
