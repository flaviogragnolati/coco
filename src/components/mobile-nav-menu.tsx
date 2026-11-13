"use client";

import {
	HelpCircleIcon,
	LayoutDashboardIcon,
	MenuIcon,
	MessageCircleIcon,
	RouteIcon,
	ShoppingBagIcon,
	SparklesIcon,
	TagsIcon,
} from "lucide-react";
import { HashSafeLink } from "~/components/hash-safe-link";
import { NavbarSearch } from "~/components/navbar-search";
import { Button, buttonVariants } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "~/components/ui/sheet";
import { homeNavLinks } from "~/features/home/home-content";
import { cn } from "~/lib/utils";
import type { CatalogCategorySummary } from "~/shared/common/catalog.types";

const navIcons = [RouteIcon, SparklesIcon, HelpCircleIcon, MessageCircleIcon];

function MobileSheetLink({
	href,
	label,
	Icon,
	variant = "ghost",
}: {
	href: string;
	label: string;
	Icon: typeof ShoppingBagIcon;
	variant?: "default" | "ghost";
}) {
	return (
		<SheetClose asChild>
			<HashSafeLink
				className={cn(buttonVariants({ variant }), "w-full justify-start")}
				href={href}
			>
				<Icon data-icon="inline-start" />
				{label}
			</HashSafeLink>
		</SheetClose>
	);
}

export function MobileNavMenu({
	isActiveUser,
	canAccessAdmin,
	categories,
}: {
	isActiveUser: boolean;
	canAccessAdmin: boolean;
	categories: CatalogCategorySummary[];
}) {
	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button
					aria-label="Abrir menú"
					size="icon"
					type="button"
					variant="ghost"
				>
					<MenuIcon />
				</Button>
			</SheetTrigger>
			<SheetContent className="w-[min(22rem,calc(100%-1rem))]">
				<SheetHeader>
					<SheetTitle>Explorá CoCo</SheetTitle>
					<SheetDescription>
						Ofertas, ayuda y accesos a tu compra en un solo lugar.
					</SheetDescription>
				</SheetHeader>
				<nav className="flex min-h-0 flex-col gap-1 overflow-y-auto px-6 pb-6">
					<NavbarSearch className="mb-4" />
					{homeNavLinks.map((link, index) => {
						const Icon = navIcons[index] ?? RouteIcon;
						return (
							<MobileSheetLink
								href={link.href}
								Icon={Icon}
								key={link.href}
								label={link.label}
							/>
						);
					})}
					<Separator className="my-3" />
					<MobileSheetLink
						href="/products"
						Icon={ShoppingBagIcon}
						label="Catálogo"
						variant="default"
					/>
					{categories.length > 0 ? (
						<section aria-label="Categorías" className="flex flex-col gap-1">
							<p className="px-3 pt-3 pb-1 font-medium text-muted-foreground text-sm">
								Categorías
							</p>
							{categories.map((category) => (
								<MobileSheetLink
									href={`/products?categoria=${category.id}`}
									Icon={TagsIcon}
									key={category.id}
									label={category.name}
								/>
							))}
						</section>
					) : null}
					{isActiveUser ? (
						<MobileSheetLink
							href="/my-orders"
							Icon={ShoppingBagIcon}
							label="Mis pedidos"
						/>
					) : null}
					{canAccessAdmin ? (
						<MobileSheetLink
							href="/admin"
							Icon={LayoutDashboardIcon}
							label="Administrador"
						/>
					) : null}
				</nav>
			</SheetContent>
		</Sheet>
	);
}
