import {
	ChevronDownIcon,
	HelpCircleIcon,
	LogInIcon,
	MenuIcon,
	SearchIcon,
	ShoppingCartIcon,
	UserIcon,
} from "lucide-react";

import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

/**
 * A still picture of `AppNavbar`: the real one reads the session, the router
 * and the cart store, none of which may run under the tutorial (ADR 0012).
 */
export function TutorialNavbar({
	cartCount,
	signedIn,
}: {
	cartCount: number;
	signedIn: boolean;
}) {
	return (
		<header className="sticky top-0 z-40 border-b bg-background">
			<div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
				<span className="shrink-0 font-bold font-heading text-3xl tracking-tight">
					coco
				</span>

				<Button
					className="hidden rounded-full sm:inline-flex"
					tabIndex={-1}
					type="button"
					variant="outline"
				>
					<MenuIcon data-icon="inline-start" />
					Catálogo
				</Button>
				<Button
					className="hidden shrink-0 rounded-full md:inline-flex"
					tabIndex={-1}
					type="button"
					variant="ghost"
				>
					Categorías
					<ChevronDownIcon data-icon="inline-end" />
				</Button>
				<div className="relative hidden max-w-[460px] flex-1 md:block">
					<SearchIcon
						aria-hidden="true"
						className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-brand-warm-foreground"
					/>
					<div className="flex h-10 items-center rounded-full bg-brand-warm pl-10 text-brand-warm-foreground/70 text-sm">
						¿Con qué producto querés ahorrar?
					</div>
				</div>

				<div className="ml-auto flex items-center gap-2">
					<Button
						className="size-[42px] rounded-full"
						size="icon"
						tabIndex={-1}
						type="button"
						variant="ghost"
					>
						<HelpCircleIcon />
						<span className="sr-only">Ayuda</span>
					</Button>
					<Button
						className="relative size-[42px] rounded-full"
						size="icon"
						tabIndex={-1}
						type="button"
						variant="ghost"
					>
						<ShoppingCartIcon />
						<span className="sr-only">Tu pedido</span>
						{cartCount > 0 ? (
							<Badge className="absolute -top-1.5 -right-1.5 min-w-5 justify-center px-1 py-0 text-[10px]">
								{cartCount}
							</Badge>
						) : null}
					</Button>
					{signedIn ? (
						<span className="flex size-[42px] items-center justify-center">
							<Avatar size="sm">
								<AvatarFallback>
									<UserIcon className="size-4" />
								</AvatarFallback>
							</Avatar>
						</span>
					) : (
						<Button
							className="size-[42px] rounded-full"
							size="icon"
							tabIndex={-1}
							type="button"
							variant="ghost"
						>
							<LogInIcon data-icon="inline-start" />
							<span className="sr-only">Ingresar</span>
						</Button>
					)}
					<div className="md:hidden">
						<Button size="icon" tabIndex={-1} type="button" variant="ghost">
							<MenuIcon />
							<span className="sr-only">Menú</span>
						</Button>
					</div>
				</div>
			</div>
		</header>
	);
}
