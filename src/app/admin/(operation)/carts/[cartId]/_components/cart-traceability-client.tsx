"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { DetailEmpty } from "~/features/admin/crud/_components/crud-detail";
import { CrudPageShell } from "~/features/admin/crud/_components/crud-page-shell";
import {
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { trackingEmailRefreshInterval } from "~/features/admin/crud/tracking/tracking.mappers";
import { TrackingTimeline } from "~/features/admin/crud/tracking/tracking-timeline.parts";
import { api } from "~/trpc/react";
import { DiagnosticList } from "./cart-item-diagnostics";
import { CartItemTraceCard } from "./cart-item-trace-card";
import { CartSummaryHeader } from "./cart-summary-header";
import { OrderPaymentPanel } from "./order-payment-panel";

export function CartTraceabilityClient({ cartId }: { cartId: number }) {
	const detailQuery = api.admin.cartTraceability.getCartTraceability.useQuery(
		{ cartId },
		{
			refetchInterval: (query) =>
				trackingEmailRefreshInterval(query.state.data?.cartTimeline),
			refetchOnWindowFocus: true,
		},
	);

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
						Ítems y linaje de fulfillment
					</h2>
					{detail.items.length > 0 ? (
						<div className="grid gap-3">
							{detail.items.map((item) => (
								<CartItemTraceCard item={item} key={item.id} />
							))}
						</div>
					) : (
						<DetailEmpty>El carrito no tiene ítems.</DetailEmpty>
					)}
				</section>

				<section className="flex flex-col gap-2">
					<h2 className="font-heading font-semibold text-lg">
						Diagnósticos del carrito
					</h2>
					<DiagnosticList
						diagnostics={detail.diagnostics}
						emptyLabel="Sin diagnósticos operativos en el linaje del carrito."
					/>
				</section>

				<section className="flex flex-col gap-2">
					<h2 className="font-heading font-semibold text-lg">
						Historial del carrito
					</h2>
					<TrackingTimeline
						emptyLabel="El carrito todavía no tiene eventos de tracking."
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
					<Link href="/admin/carts">Volver a carritos</Link>
				</Button>
			}
			description="Linaje de fulfillment, órdenes, pagos, diagnósticos e historial de un carrito, en una sola pantalla de solo lectura."
			title="Trazabilidad de carrito"
		>
			{renderContent()}
		</CrudPageShell>
	);
}
