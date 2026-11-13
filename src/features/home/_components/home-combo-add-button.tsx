"use client";

import { Button } from "~/components/ui/button";
import { useCartActions } from "~/features/cart/use-cart-sync";
import { cn } from "~/lib/utils";
import type { HomeComboOption } from "~/shared/common/home.types";
import { useCartStore } from "~/store/cart-store";
import { useCartUiStore } from "~/store/cart-ui-store";

export function HomeComboAddButton({
	option,
	isAuthenticated,
	userId,
	size = "default",
}: {
	option: HomeComboOption;
	isAuthenticated: boolean;
	userId: string | null;
	size?: "default" | "compact";
}) {
	const { addCombo, isPending } = useCartActions({ isAuthenticated, userId });
	const openMiniCart = useCartUiStore((state) => state.openMiniCart);
	const hasHydrated = useCartStore((state) => state.hasHydrated);

	return (
		<Button
			className={cn(
				"w-full rounded-full",
				size === "compact" ? "h-11 sm:h-10" : "h-11",
			)}
			disabled={!hasHydrated || isPending}
			onClick={() => {
				addCombo(option);
				openMiniCart();
			}}
			size="lg"
			type="button"
			variant="highlight"
		>
			Sumar combo
		</Button>
	);
}
