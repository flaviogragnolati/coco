"use client";

import { LogInIcon, PackageSearchIcon, ShoppingBagIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "~/components/ui/empty";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import { CartLineRow } from "~/features/cart/_components/cart-line-row";
import { TransferTotalHint } from "~/features/cart/_components/transfer-total";
import type { CartSnapshot } from "~/shared/common/cart.types";
import { formatCurrency } from "~/shared/common/commerce.helpers";

type DataAttributes = { [key: `data-${string}`]: string };

export type CartLineHandlers = Required<
	Pick<
		React.ComponentProps<typeof CartLineRow>,
		"onDecrement" | "onIncrement" | "onQuantityCommit" | "onRemove"
	>
>;

export function CartSheetView({
	open,
	onOpenChange,
	modal = true,
	inert,
	hasHydrated,
	cart,
	isAuthenticated,
	mergeBlocked,
	isPending,
	onDecrement,
	onIncrement,
	onQuantityCommit,
	onRemove,
	onNavigate,
	targets,
	transferDiscountPercent,
}: CartLineHandlers & {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	modal?: boolean;
	/** Set on the portaled content itself: the sheet escapes any inert ancestor. */
	inert?: boolean;
	hasHydrated: boolean;
	cart: CartSnapshot;
	isAuthenticated: boolean;
	mergeBlocked: boolean;
	isPending: boolean;
	/** Runs when a link inside the sheet is followed. */
	onNavigate: () => void;
	/** Marks regions for an outside walkthrough; absent on the real sheet. */
	targets?: { content?: DataAttributes };
	transferDiscountPercent: number | null;
}) {
	const hasItems = cart.itemCount > 0;

	return (
		<Sheet modal={modal} onOpenChange={onOpenChange} open={open}>
			<SheetContent
				className="gap-0"
				inert={inert}
				side="right"
				{...targets?.content}
			>
				<SheetHeader>
					<div className="flex items-center justify-between gap-3 pr-8">
						<SheetTitle>Tu pedido</SheetTitle>
						{hasHydrated && hasItems ? (
							<Badge variant="secondary">
								{cart.itemCount} {cart.itemCount === 1 ? "línea" : "líneas"}
							</Badge>
						) : null}
					</div>
					<SheetDescription>
						Revisá cantidades y subtotales antes de ver el pedido completo.
					</SheetDescription>
				</SheetHeader>

				{!hasHydrated ? (
					<div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
						<Skeleton className="h-24 w-full rounded-3xl" />
						<Skeleton className="h-24 w-full rounded-3xl" />
					</div>
				) : hasItems ? (
					<div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
						{cart.items.map((item) => (
							<CartLineRow
								disabled={isPending}
								item={item}
								key={item.productClientTermsId}
								onDecrement={onDecrement}
								onIncrement={onIncrement}
								onQuantityCommit={onQuantityCommit}
								onRemove={onRemove}
								variant="compact"
							/>
						))}
					</div>
				) : (
					<div className="flex flex-1 items-center px-6 py-4">
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<PackageSearchIcon />
								</EmptyMedia>
								<EmptyTitle>Tu pedido está vacío</EmptyTitle>
								<EmptyDescription>
									Agregá productos del catálogo para empezar a armar tu pedido.
								</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<Button asChild onClick={onNavigate}>
									<Link href="/products">Ver productos</Link>
								</Button>
							</EmptyContent>
						</Empty>
					</div>
				)}

				{hasHydrated && hasItems ? (
					<SheetFooter className="border-t pt-4">
						<div className="flex flex-col gap-2">
							{cart.totals.map((total) => (
								<div className="flex flex-col gap-1" key={total.currency}>
									<div className="flex items-center justify-between gap-3">
										<span className="text-muted-foreground text-xs">
											Total estimado
										</span>
										<span className="font-heading font-semibold text-lg">
											{formatCurrency(total.amount, total.currency)}
										</span>
									</div>
									<TransferTotalHint
										percent={transferDiscountPercent}
										total={total}
									/>
								</div>
							))}
						</div>
						{isAuthenticated && mergeBlocked ? (
							<Button
								asChild
								className="w-full"
								onClick={onNavigate}
								variant="outline"
							>
								<Link href="/cart">Ver productos pendientes de agregar</Link>
							</Button>
						) : isAuthenticated ? (
							<Button
								asChild
								className="w-full"
								onClick={onNavigate}
								variant="highlight"
							>
								<Link href="/checkout">
									<ShoppingBagIcon data-icon="inline-start" />
									Ir a pagar
								</Link>
							</Button>
						) : (
							<Button
								asChild
								className="w-full"
								onClick={onNavigate}
								variant="highlight"
							>
								<Link href="/login?callbackURL=/checkout">
									<LogInIcon data-icon="inline-start" />
									Registrarme o iniciar sesión
								</Link>
							</Button>
						)}
						<Button
							asChild
							className="w-full"
							onClick={onNavigate}
							variant="outline"
						>
							<Link href="/cart">Ver pedido completo</Link>
						</Button>
					</SheetFooter>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
