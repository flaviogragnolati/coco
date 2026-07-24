"use client";

import { StoreIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "~/components/ui/sidebar";
import { UserMenu } from "~/components/user-menu";
import type { AuthUser } from "~/server/auth/auth.utils";
import { adminHome, adminNavGroups, findAdminNavItem } from "./admin-nav";

// The shared menu button paints hover and active alike; the admin chrome marks
// the active entry with the amber `--sidebar-primary` instead.
const activeItemClassName =
	"data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground data-active:hover:bg-sidebar-primary data-active:hover:text-sidebar-primary-foreground";

export function AdminSidebar({ user }: { user: AuthUser }) {
	const pathname = usePathname();
	const activeHref = findAdminNavItem(pathname)?.item.href;
	const HomeIcon = adminHome.icon;

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton asChild size="lg" tooltip="Coco · Admin">
							<Link href={adminHome.href}>
								<span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary font-heading font-semibold text-sidebar-primary-foreground">
									C
								</span>
								<span className="flex min-w-0 flex-col">
									<span className="truncate font-heading font-semibold">
										Coco
									</span>
									<span className="truncate text-sidebar-foreground/70 text-xs">
										Administración
									</span>
								</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									asChild
									className={activeItemClassName}
									isActive={activeHref === adminHome.href}
									tooltip={adminHome.title}
								>
									<Link href={adminHome.href}>
										<HomeIcon />
										<span>{adminHome.title}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				{adminNavGroups.map((group) => (
					<SidebarGroup key={group.label}>
						<SidebarGroupLabel>{group.label}</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{group.items.map((item) => {
									const ItemIcon = item.icon;

									return (
										<SidebarMenuItem key={item.href}>
											<SidebarMenuButton
												asChild
												className={activeItemClassName}
												isActive={activeHref === item.href}
												tooltip={item.title}
											>
												<Link href={item.href}>
													<ItemIcon />
													<span>{item.title}</span>
												</Link>
											</SidebarMenuButton>
										</SidebarMenuItem>
									);
								})}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				))}
			</SidebarContent>

			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton asChild tooltip="Ver tienda">
							<Link href="/">
								<StoreIcon />
								<span>Ver tienda</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem className="flex items-center gap-2 px-1 py-1 group-data-[collapsible=icon]:px-0">
						<UserMenu
							user={{ email: user.email, image: user.image, name: user.name }}
						/>
						<span className="flex min-w-0 flex-col text-xs leading-tight group-data-[collapsible=icon]:hidden">
							<span className="truncate font-medium">{user.name}</span>
							<span className="truncate text-sidebar-foreground/70">
								{user.email}
							</span>
						</span>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>

			<SidebarRail />
		</Sidebar>
	);
}
