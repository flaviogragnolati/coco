"use client";

import { LogInIcon, PencilIcon, ShoppingBagIcon } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import type { CartSnapshot } from "~/shared/common/cart.types";
import { formatCurrency } from "~/shared/common/commerce.helpers";

function cartStatusLabel(status: CartSnapshot["status"]) {
	switch (status) {
		case "draft":
			return "Borrador";
		case "pending":
			return "Pendiente";
		case "atCheckout":
			return "En checkout";
		case "submitted":
			return "Enviado";
		case "abandoned":
			return "Abandonado";
		case "cancelled":
			return "Cancelado";
		case "aborted":
			return "Abortado";
		default:
			return "Local";
	}
}

export function CartSummary({
	cart,
	isAuthenticated,
	onClear,
	onLeaveCheckout,
	isPending,
}: {
	cart: CartSnapshot;
	isAuthenticated: boolean;
	isPending?: boolean;
	onClear: () => void;
	onLeaveCheckout: () => void;
}) {
	const atCheckout = cart.status === "atCheckout";
	return (
		<Card className="lg:sticky lg:top-20">
			<CardHeader>
				<div className="flex items-center justify-between gap-3">
					<CardTitle>Resumen</CardTitle>
					<Badge variant="secondary">{cartStatusLabel(cart.status)}</Badge>
				</div>
				<CardDescription>
					{cart.code
						? `Carrito ${cart.code}`
						: "Carrito guardado en este browser"}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="grid gap-2 text-xs">
					<div className="flex items-center justify-between gap-3">
						<span className="text-muted-foreground">Líneas</span>
						<span className="font-medium">{cart.itemCount}</span>
					</div>
					<div className="flex items-center justify-between gap-3">
						<span className="text-muted-foreground">Unidades acumuladas</span>
						<span className="font-medium">{cart.totalQuantity}</span>
					</div>
				</div>
				<Separator />
				<div className="flex flex-col gap-2">
					<span className="text-muted-foreground text-xs">
						Totales estimados
					</span>
					{cart.totals.length > 0 ? (
						cart.totals.map((total) => (
							<div
								className="flex items-center justify-between gap-3"
								key={total.currency}
							>
								<Badge variant="info">{total.currency}</Badge>
								<span className="font-heading font-semibold text-lg">
									{formatCurrency(total.amount, total.currency)}
								</span>
							</div>
						))
					) : (
						<span className="text-muted-foreground text-xs">Sin items</span>
					)}
				</div>

				{atCheckout ? (
					<Alert>
						<ShoppingBagIcon />
						<AlertTitle>Checkout en curso</AlertTitle>
						<AlertDescription>
							El carrito está congelado mientras se procesa el pago. Volvé a
							editarlo para cambiar cantidades o productos.
						</AlertDescription>
					</Alert>
				) : isAuthenticated ? (
					<Alert>
						<ShoppingBagIcon />
						<AlertTitle>Listo para checkout</AlertTitle>
						<AlertDescription>
							Confirmá dirección, método de pago y resumen final antes de enviar
							el pedido.
						</AlertDescription>
					</Alert>
				) : (
					<Alert>
						<LogInIcon />
						<AlertTitle>Iniciá sesión para continuar</AlertTitle>
						<AlertDescription>
							Podés armar el carrito como invitado. Para iniciar checkout,
							necesitamos asociarlo a tu usuario.
						</AlertDescription>
					</Alert>
				)}
			</CardContent>
			<CardFooter className="flex flex-col gap-2">
				{isAuthenticated ? (
					<Button asChild className="w-full" variant="highlight">
						<Link href="/checkout">
							<ShoppingBagIcon data-icon="inline-start" />
							Ir a pagar
						</Link>
					</Button>
				) : (
					<Button asChild className="w-full" variant="highlight">
						<Link href="/login?callbackURL=/checkout">
							<LogInIcon data-icon="inline-start" />
							Registrarme o iniciar sesión
						</Link>
					</Button>
				)}
				{atCheckout ? (
					<Button
						className="w-full"
						disabled={isPending}
						onClick={onLeaveCheckout}
						type="button"
						variant="outline"
					>
						<PencilIcon data-icon="inline-start" />
						Volver a editar el carrito
					</Button>
				) : null}
				<Button
					className="w-full"
					disabled={isPending || atCheckout || cart.itemCount === 0}
					onClick={onClear}
					type="button"
					variant="outline"
				>
					Vaciar carrito
				</Button>
			</CardFooter>
		</Card>
	);
}
