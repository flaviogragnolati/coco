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
