"use client";

import { PackageSearchIcon, PencilIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "~/components/ui/empty";
import { Separator } from "~/components/ui/separator";
import { CartLineRow } from "~/features/cart/_components/cart-line-row";
import type { CartSnapshot } from "~/shared/common/cart.types";
import { formatCurrency } from "~/shared/common/commerce.helpers";

export function CheckoutOrderStep({
	cart,
	onEditCart,
}: {
	cart: CartSnapshot;
	onEditCart: () => void;
}) {
	if (cart.items.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Tu pedido</CardTitle>
					<CardDescription>
						Revisá los productos antes de continuar.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<PackageSearchIcon />
							</EmptyMedia>
							<EmptyTitle>Tu carrito está vacío</EmptyTitle>
							<EmptyDescription>
								Agregá productos del catálogo para continuar con el checkout.
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button asChild>
								<Link href="/products">Ver productos</Link>
							</Button>
						</EmptyContent>
					</Empty>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between gap-3">
					<div className="flex flex-col gap-1">
						<CardTitle>Tu pedido</CardTitle>
						<CardDescription>
							Estos productos se enviarán a la agregación mayorista.
						</CardDescription>
					</div>
					<Button onClick={onEditCart} type="button" variant="outline">
						<PencilIcon data-icon="inline-start" />
						Editar carrito
					</Button>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="flex flex-col gap-3">
					{cart.items.map((item) => (
						<CartLineRow
							item={item}
							key={item.productClientTermsId}
							readOnly
							variant="compact"
						/>
					))}
				</div>
				<Separator />
				<div className="grid gap-2 text-xs">
					<div className="flex items-center justify-between gap-3">
						<span className="text-muted-foreground">Productos</span>
						<span className="font-medium">{cart.itemCount}</span>
					</div>
					<div className="flex items-center justify-between gap-3">
						<span className="text-muted-foreground">Unidades acumuladas</span>
						<span className="font-medium">{cart.totalQuantity}</span>
					</div>
				</div>
				<Separator />
				<div className="flex flex-col gap-2">
					<span className="text-muted-foreground text-xs">Total estimado</span>
					{cart.totals.map((total) => (
						<div
							className="flex items-center justify-between gap-3"
							key={total.currency}
						>
							<Badge variant="info">{total.currency}</Badge>
							<span className="font-heading font-semibold text-lg">
								{formatCurrency(total.amount, total.currency)}
							</span>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
