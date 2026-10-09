import type { PackageListItem } from "~/shared/common/admin-crud/package.types";
import type { DeliveryPreference } from "~/shared/common/delivery-display";
import { deliveryPreferenceLabelMap } from "~/shared/common/delivery-display";

export type OutboundPackageGroup = {
	key: string;
	label: string;
	/** What selecting the group pre-fills on the shipment; null when it cannot. */
	delivery: { mode: DeliveryPreference; pickupPointId: number | null } | null;
	packages: PackageListItem[];
};

type GroupSeed = Omit<OutboundPackageGroup, "packages">;

function groupOf(pkg: PackageListItem): GroupSeed {
	if (pkg.orderCount > 1) {
		return { key: "multi", label: "Varios pedidos", delivery: null };
	}

	const order = pkg.order;
	if (!order || order.deliveryPreference === null) {
		return { key: "none", label: "Sin elección", delivery: null };
	}

	if (order.deliveryPreference === "pickupPoint") {
		return {
			key: `pickupPoint:${order.pickupPointId}`,
			label: `${deliveryPreferenceLabelMap.pickupPoint} · ${order.pickupPointName ?? "Sin nombre"}`,
			delivery: { mode: "pickupPoint", pickupPointId: order.pickupPointId },
		};
	}

	// A home delivery is one customer's, so each order is its own group.
	return {
		key: `homeDelivery:${order.orderId}`,
		label: `${deliveryPreferenceLabelMap.homeDelivery} · ${order.customerName} · ${order.orderCode}`,
		delivery: { mode: "homeDelivery", pickupPointId: null },
	};
}

const groupRank = (key: string) =>
	key.startsWith("pickupPoint:")
		? 0
		: key.startsWith("homeDelivery:")
			? 1
			: key === "none"
				? 2
				: 3;

/**
 * The picker's buckets: one per pickup point, one per home-delivery order, then
 * the orders that never chose ("Sin elección") and the packages that serve
 * several orders, which the server judges order by order.
 */
export function groupOutboundPackages(
	packages: PackageListItem[],
): OutboundPackageGroup[] {
	const groups = new Map<string, OutboundPackageGroup>();

	for (const pkg of packages) {
		const seed = groupOf(pkg);
		const group = groups.get(seed.key);
		if (group) group.packages.push(pkg);
		else groups.set(seed.key, { ...seed, packages: [pkg] });
	}

	return [...groups.values()].sort(
		(left, right) =>
			groupRank(left.key) - groupRank(right.key) ||
			left.label.localeCompare(right.label, "es"),
	);
}
