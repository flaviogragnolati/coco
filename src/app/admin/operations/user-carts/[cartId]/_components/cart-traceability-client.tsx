"use client";

import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { CrudPageShell } from "~/features/admin/crud/_components/crud-page-shell";
import {
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { TrackingTimeline } from "~/features/admin/crud/tracking/tracking-timeline.parts";
import { api } from "~/trpc/react";
import { DiagnosticList } from "./cart-item-diagnostics";
import { CartItemTraceCard } from "./cart-item-trace-card";
import { CartSummaryHeader } from "./cart-summary-header";
import { OrderPaymentPanel } from "./order-payment-panel";

export function CartTraceabilityClient({ cartId }: { cartId: number }) {
	const detailQuery = api.admin.cartTraceability.getCartTraceability.useQuery({
		cartId,
	});

	const renderContent = () => {
		if (detailQuery.isLoading) {
			return (
				<div className="grid gap-3">
					<Skeleton className="h-28 w-full" />
					<CrudLoadingState rows={4} />
				</div>
			);
		}

		if (detailQuery.isError) {
			return (
				<CrudErrorState
					message={
						detailQuery.error.message ||
						"No se pudo cargar la trazabilidad del carrito"
					}
				/>
			);
		}

		const detail = detailQuery.data;
		if (!detail) return null;

		return (
			<div className="grid gap-5">
				<CartSummaryHeader
					aggregate={detail.aggregate}
					cart={detail.cart}
					diagnosticCount={detail.diagnostics.length}
					highestDiagnosticSeverity={detail.highestDiagnosticSeverity}
				/>

				<OrderPaymentPanel orders={detail.orders} />

				<section className="flex flex-col gap-2">
					<h2 className="font-heading font-semibold text-lg">
						Items y lineage de fulfillment
					</h2>
					{detail.items.length > 0 ? (
						<div className="grid gap-3">
							{detail.items.map((item) => (
								<CartItemTraceCard item={item} key={item.id} />
							))}
						</div>
					) : (
						<div className="rounded-none border p-3 text-muted-foreground text-sm">
							El carrito no tiene items.
						</div>
					)}
				</section>

				<section className="flex flex-col gap-2">
					<h2 className="font-heading font-semibold text-lg">
						Diagnosticos del carrito
					</h2>
					<DiagnosticList
						diagnostics={detail.diagnostics}
						emptyLabel="Sin diagnosticos operativos en el lineage del carrito."
					/>
				</section>

				<section className="flex flex-col gap-2">
					<h2 className="font-heading font-semibold text-lg">
						Timeline del carrito
					</h2>
					<TrackingTimeline
						emptyLabel="El carrito todavia no tiene eventos de tracking."
						items={detail.cartTimeline}
					/>
				</section>
			</div>
		);
	};

	return (
		<CrudPageShell
			actions={
				<Button asChild variant="outline">
					<a href="/admin/operations/user-carts">Volver a carritos</a>
				</Button>
			}
			description="Lineage de fulfillment, ordenes, pagos, diagnosticos y timelines de un carrito, en una sola pantalla de solo lectura."
			title="Trazabilidad de carrito"
		>
			{renderContent()}
		</CrudPageShell>
	);
}
