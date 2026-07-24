"use client";

import {
	HelpCircleIcon,
	LayoutDashboardIcon,
	MenuIcon,
	MessageCircleIcon,
	RouteIcon,
	ShoppingBagIcon,
	SparklesIcon,
} from "lucide-react";
import Link from "next/link";

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
			<Link
				className={cn(buttonVariants({ variant }), "w-full justify-start")}
				href={href}
			>
				<Icon data-icon="inline-start" />
				{label}
			</Link>
		</SheetClose>
	);
}

export function MobileNavMenu({
	isActiveUser,
	canAccessAdmin,
}: {
	isActiveUser: boolean;
	canAccessAdmin: boolean;
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
					<SheetTitle>Explorá Coco</SheetTitle>
					<SheetDescription>
						Ofertas, ayuda y accesos a tu compra en un solo lugar.
					</SheetDescription>
				</SheetHeader>
				<nav className="flex flex-col gap-1 px-6">
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
						label="Comprar"
						variant="default"
					/>
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
