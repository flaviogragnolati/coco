import { Badge } from "~/components/ui/badge";
import { OperationalDiagnosticBadge } from "~/features/admin/crud/_components/operational-diagnostic-badge";
import {
	cartStatusLabelMap,
	fulfillmentStatusLabelMap,
} from "~/features/admin/crud/operations-cart/operations-cart.mappers";
import type { OperationalDiagnosticSeverity } from "~/shared/common/admin-crud/operational-diagnostic.types";
import type {
	CartTraceabilityAggregate,
	CartTraceabilityCart,
} from "~/shared/common/cart-traceability.types";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

export function CartSummaryHeader({
	cart,
	aggregate,
	diagnosticCount,
	highestDiagnosticSeverity,
}: {
	cart: CartTraceabilityCart;
	aggregate: CartTraceabilityAggregate;
	diagnosticCount: number;
	highestDiagnosticSeverity: OperationalDiagnosticSeverity | null;
}) {
	return (
		<section className="flex flex-col gap-3">
			<div className="grid gap-3 rounded-none border p-3 md:grid-cols-4">
				<div className="flex flex-col gap-1">
					<span className="text-muted-foreground text-xs">Carrito</span>
					<span className="font-mono">{cart.code}</span>
					<span className="text-muted-foreground text-xs">
						#{cart.id} / {cartStatusLabelMap[cart.status]}
					</span>
					{cart.deleted ? <Badge variant="destructive">Eliminado</Badge> : null}
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-muted-foreground text-xs">Usuario</span>
					<span className="font-medium">{cart.user.name}</span>
					<span className="text-muted-foreground text-xs">
						{cart.user.email}
					</span>
					<span className="text-muted-foreground text-xs">
						Rol: {cart.user.role}
					</span>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-muted-foreground text-xs">Fechas</span>
					<span className="text-xs">
						Creado: {dateFormatter.format(new Date(cart.createdAt))}
					</span>
					<span className="text-xs">
						Actualizado: {dateFormatter.format(new Date(cart.updatedAt))}
					</span>
				</div>
				<div className="flex flex-col items-start gap-1">
					<span className="text-muted-foreground text-xs">Diagnosticos</span>
					<OperationalDiagnosticBadge
						count={diagnosticCount}
						severity={highestDiagnosticSeverity}
					/>
					<span className="text-muted-foreground text-xs">
						{aggregate.itemCount} item{aggregate.itemCount === 1 ? "" : "s"}
					</span>
				</div>
			</div>

			<div className="flex flex-col gap-2 rounded-none border p-3">
				<span className="text-muted-foreground text-xs">
					Resumen de fulfillment
				</span>
				{aggregate.fulfillmentSummary.length > 0 ? (
					<div className="flex flex-wrap gap-1">
						{aggregate.fulfillmentSummary.map((entry) => (
							<Badge key={entry.status} variant="outline">
								{fulfillmentStatusLabelMap[entry.status]}: {entry.count}
							</Badge>
						))}
					</div>
				) : (
					<span className="text-muted-foreground text-xs">
						El carrito no tiene items.
					</span>
				)}
			</div>
		</section>
	);
}
