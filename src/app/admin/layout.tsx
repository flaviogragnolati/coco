import type { Metadata } from "next";
import { cookies } from "next/headers";

import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { AdminFab } from "~/features/admin/shell/admin-fab";
import { AdminHeader } from "~/features/admin/shell/admin-header";
import { AdminSidebar } from "~/features/admin/shell/admin-sidebar";
import { requireAdmin } from "~/server/auth/route-guards";

export const metadata: Metadata = {
	title: { template: "%s · Coco Admin", default: "Coco Admin" },
};

export default async function AdminLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const session = await requireAdmin();
	// The sidebar writes this cookie on toggle; reading it here keeps the rail
	// collapsed across full page loads instead of flashing back open.
	const sidebarState = (await cookies()).get("sidebar_state")?.value;

	return (
		<SidebarProvider defaultOpen={sidebarState !== "false"}>
			<AdminSidebar user={session.user} />
			{/* SidebarInset already renders the page-level <main>. */}
			<SidebarInset>
				<AdminHeader />
				<div className="flex min-w-0 flex-1 flex-col p-4 md:p-6">
					{children}
				</div>
				<AdminFab />
			</SidebarInset>
		</SidebarProvider>
	);
}
