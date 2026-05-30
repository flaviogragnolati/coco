"use client";

import { LogInIcon, ShoppingBagIcon } from "lucide-react";
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
	isPending,
}: {
	cart: CartSnapshot;
	isAuthenticated: boolean;
	isPending?: boolean;
	onClear: () => void;
}) {
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
						<span className="text-muted-foreground">Lineas</span>
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
								<span className="text-xs">{total.currency}</span>
								<span className="font-heading font-semibold text-lg">
									{formatCurrency(total.amount, total.currency)}
								</span>
							</div>
						))
					) : (
						<span className="text-muted-foreground text-xs">Sin items</span>
					)}
				</div>

				{isAuthenticated ? (
					<Alert>
						<ShoppingBagIcon />
						<AlertTitle>Checkout proximamente</AlertTitle>
						<AlertDescription>
							El carrito ya queda preparado para conectar confirmacion, pago y
							entrega en la siguiente etapa.
						</AlertDescription>
					</Alert>
				) : (
					<Alert>
						<LogInIcon />
						<AlertTitle>Inicia sesion para continuar</AlertTitle>
						<AlertDescription>
							Podes armar el carrito como invitado. Para iniciar checkout,
							necesitamos asociarlo a tu usuario.
						</AlertDescription>
					</Alert>
				)}
			</CardContent>
			<CardFooter className="flex flex-col gap-2">
				{isAuthenticated ? (
					<Button className="w-full" disabled type="button">
						<ShoppingBagIcon data-icon="inline-start" />
						Iniciar checkout
					</Button>
				) : (
					<Button asChild className="w-full">
						<Link href="/login">
							<LogInIcon data-icon="inline-start" />
							Iniciar sesion
						</Link>
					</Button>
				)}
				<Button
					className="w-full"
					disabled={isPending || cart.itemCount === 0}
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
