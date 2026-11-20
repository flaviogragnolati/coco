import { Badge } from "~/components/ui/badge";
import {
	DetailDatesField,
	DetailEmpty,
	DetailField,
	DetailGrid,
	DetailSection,
} from "~/features/admin/crud/_components/crud-detail";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { OperationalDiagnosticBadge } from "~/features/admin/crud/_components/operational-diagnostic-badge";
import {
	cartStatusConfig,
	fulfillmentStatusConfig,
} from "~/features/admin/crud/operations-cart/operations-cart.mappers";
import type { OperationalDiagnosticSeverity } from "~/shared/common/admin-crud/operational-diagnostic.types";
import type {
	CartTraceabilityAggregate,
	CartTraceabilityCart,
} from "~/shared/common/cart-traceability.types";

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
			<DetailSection
				actions={
					<div className="flex flex-wrap items-center gap-1.5">
						<StatusChip config={cartStatusConfig[cart.status]} />
						{cart.deleted ? (
							<Badge variant="destructive">Eliminado</Badge>
						) : null}
					</div>
				}
				title="Datos del carrito"
			>
				<DetailGrid columns={4}>
					<DetailField
						hint={<span className="font-mono">#{cart.id}</span>}
						label="Carrito"
					>
						<span className="font-mono">{cart.code}</span>
					</DetailField>
					<DetailField
						hint={
							<>
								<span className="block">{cart.user.email}</span>
								<span className="block">Rol: {cart.user.role}</span>
							</>
						}
						label="Usuario"
					>
						{cart.user.name}
					</DetailField>
					<DetailDatesField
						createdAt={cart.createdAt}
						updatedAt={cart.updatedAt}
					/>
					<DetailField label="Diagnósticos">
						<OperationalDiagnosticBadge
							count={diagnosticCount}
							severity={highestDiagnosticSeverity}
						/>
					</DetailField>
				</DetailGrid>
			</DetailSection>

			<DetailSection
				description={`${aggregate.itemCount} ítem${aggregate.itemCount === 1 ? "" : "s"} en el carrito`}
				title="Resumen de fulfillment"
			>
				{aggregate.fulfillmentSummary.length > 0 ? (
					<div className="flex flex-wrap gap-x-3 gap-y-2">
						{aggregate.fulfillmentSummary.map((entry) => (
							<span
								className="inline-flex items-center gap-1.5"
								key={entry.status}
							>
								<StatusChip config={fulfillmentStatusConfig[entry.status]} />
								<span className="font-medium text-xs tabular-nums">
									{entry.count}
								</span>
							</span>
						))}
					</div>
				) : (
					<DetailEmpty>El carrito no tiene ítems.</DetailEmpty>
				)}
			</DetailSection>
		</section>
	);
}
