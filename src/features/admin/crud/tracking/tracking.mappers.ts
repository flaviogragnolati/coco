import {
	AlertTriangle,
	BadgeCheck,
	Boxes,
	ClipboardList,
	Layers,
	Package,
	PackageCheck,
	Pencil,
	RotateCcw,
	Send,
	ShoppingCart,
	Trash2,
	Truck,
	Warehouse,
} from "lucide-react";
import type { StatusConfig } from "~/shared/common/admin-crud/status-config";
import { statusPresets } from "~/shared/common/admin-crud/status-presets";
import {
	type TrackingEventSource,
	type TrackingEventType,
	trackingEventLabelMap,
	trackingEventSources,
	trackingEventTypes,
	trackingSourceLabelMap,
} from "~/shared/common/tracking-display";

export const trackingEventTypeOptions: Array<{
	value: TrackingEventType;
	label: string;
}> = trackingEventTypes.map((eventType) => ({
	value: eventType,
	label: trackingEventLabelMap[eventType],
}));

export const trackingSourceOptions: Array<{
	value: TrackingEventSource;
	label: string;
}> = trackingEventSources.map((source) => ({
	value: source,
	label: trackingSourceLabelMap[source],
}));

// A tracking timeline is an event log, not a lifecycle: only `fulfillmentException`
// and cancellations are hard "bad" (red), the received/delivered milestones are
// green, rollovers are amber follow-ups, the cart-only start is gray, and the
// bulk of normal progress is blue. Icons are overridden where a distinctive glyph
// helps scan the timeline; otherwise the preset default applies.
export const trackingEventTypeConfig: Record<TrackingEventType, StatusConfig> =
	{
		addedToCart: {
			...statusPresets.inert,
			icon: ShoppingCart,
			label: trackingEventLabelMap.addedToCart,
		},
		submittedToOrder: {
			...statusPresets.inProgress,
			icon: Send,
			label: trackingEventLabelMap.submittedToOrder,
		},
		cartItemQuantityChanged: {
			...statusPresets.inProgress,
			icon: Pencil,
			label: trackingEventLabelMap.cartItemQuantityChanged,
		},
		cartItemRemoved: {
			...statusPresets.failed,
			icon: Trash2,
			label: trackingEventLabelMap.cartItemRemoved,
		},
		cartItemCancelled: {
			...statusPresets.failed,
			label: trackingEventLabelMap.cartItemCancelled,
		},
		fulfillmentException: {
			...statusPresets.failed,
			icon: AlertTriangle,
			label: trackingEventLabelMap.fulfillmentException,
		},
		exceptionResolved: {
			...statusPresets.success,
			label: trackingEventLabelMap.exceptionResolved,
		},
		includedInOperation: {
			...statusPresets.inProgress,
			icon: Layers,
			label: trackingEventLabelMap.includedInOperation,
		},
		allocatedToLotItem: {
			...statusPresets.inProgress,
			icon: Boxes,
			label: trackingEventLabelMap.allocatedToLotItem,
		},
		includedInSupplierOrder: {
			...statusPresets.inProgress,
			icon: ClipboardList,
			label: trackingEventLabelMap.includedInSupplierOrder,
		},
		supplierConfirmed: {
			...statusPresets.inProgress,
			icon: BadgeCheck,
			label: trackingEventLabelMap.supplierConfirmed,
		},
		packaged: {
			...statusPresets.inProgress,
			icon: Package,
			label: trackingEventLabelMap.packaged,
		},
		movedInInternalShipment: {
			...statusPresets.inProgress,
			icon: Truck,
			label: trackingEventLabelMap.movedInInternalShipment,
		},
		receivedAtWarehouse: {
			...statusPresets.success,
			icon: Warehouse,
			label: trackingEventLabelMap.receivedAtWarehouse,
		},
		movedInEndUserShipment: {
			...statusPresets.inProgress,
			icon: Truck,
			label: trackingEventLabelMap.movedInEndUserShipment,
		},
		delivered: {
			...statusPresets.success,
			icon: PackageCheck,
			label: trackingEventLabelMap.delivered,
		},
		rolledOverPreAllocation: {
			...statusPresets.attention,
			icon: RotateCcw,
			label: trackingEventLabelMap.rolledOverPreAllocation,
		},
		rolledOverPostAllocation: {
			...statusPresets.attention,
			icon: RotateCcw,
			label: trackingEventLabelMap.rolledOverPostAllocation,
		},
	};

export function formatTrackingRefs(refs: {
	operationId: number | null;
	cartItemLotItemId: number | null;
	packageAllocationId: number | null;
	lotId: number | null;
	lotItemId: number | null;
	packageId: number | null;
	shipmentId: number | null;
	rollOverId: number | null;
}) {
	return [
		refs.operationId ? `Op #${refs.operationId}` : null,
		refs.lotId ? `Lote #${refs.lotId}` : null,
		refs.lotItemId ? `LotItem #${refs.lotItemId}` : null,
		refs.packageId ? `Paq #${refs.packageId}` : null,
		refs.shipmentId ? `Envio #${refs.shipmentId}` : null,
		refs.rollOverId ? `Rollover #${refs.rollOverId}` : null,
		refs.cartItemLotItemId ? `CILI #${refs.cartItemLotItemId}` : null,
		refs.packageAllocationId ? `Alloc #${refs.packageAllocationId}` : null,
	].filter((value): value is string => Boolean(value));
}
