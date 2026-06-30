"use client";

import { ShoppingCartIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import { useCartSync } from "~/features/cart/use-cart-sync";
import { useCartStore } from "~/store/cart-store";
import { useCartUiStore } from "~/store/cart-ui-store";

export function CartNavButton({
	isAuthenticated,
	userId,
}: {
	isAuthenticated: boolean;
	userId?: string | null;
}) {
	const { isSyncing } = useCartSync({ isAuthenticated, userId });
	const openMiniCart = useCartUiStore((state) => state.openMiniCart);
	const itemCount = useCartStore((state) =>
		state.hasHydrated ? Object.keys(state.items).length : 0,
	);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					aria-label="Abrir carrito"
					className="relative"
					onClick={openMiniCart}
					size="icon"
					type="button"
					variant="ghost"
				>
					<ShoppingCartIcon />
					{itemCount > 0 ? (
						<Badge className="absolute -top-1.5 -right-1.5 min-w-5 justify-center px-1 py-0 text-[10px]">
							{itemCount}
						</Badge>
					) : null}
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				{isSyncing ? "Sincronizando carrito" : "Abrir carrito"}
			</TooltipContent>
		</Tooltip>
	);
}
