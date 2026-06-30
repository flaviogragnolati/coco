import { RotateCcw } from "lucide-react";

import type { StatusConfig } from "~/shared/common/admin-crud/status-config";
import { statusPresets } from "~/shared/common/admin-crud/status-presets";

/**
 * Payment statuses arrive as loose `string`s spanning two enums
 * (`paymentAttemptStatus` + `paymentProviderEventStatus`), so this is a
 * string-keyed map with a mandatory fallback rather than an exhaustive `Record`.
 * Labels keep the raw status string to preserve the existing display.
 */
export const paymentStatusConfig: Record<string, StatusConfig> = {
	completed: { ...statusPresets.success, label: "completed" },
	processed: { ...statusPresets.success, label: "processed" },
	failed: { ...statusPresets.failed, label: "failed" },
	cancelled: { ...statusPresets.failed, label: "cancelled" },
	chargedBack: { ...statusPresets.failed, label: "chargedBack" },
	rejected: { ...statusPresets.failed, label: "rejected" },
	pending: { ...statusPresets.inProgress, label: "pending" },
	inProcess: { ...statusPresets.inProgress, label: "inProcess" },
	processing: { ...statusPresets.inProgress, label: "processing" },
	received: { ...statusPresets.inProgress, label: "received" },
	refunded: { label: "refunded", variant: "info", icon: RotateCcw },
	ignored: { ...statusPresets.inert, label: "ignored" },
};

/**
 * Resolve a payment status string to a chip config. Unknown values fall back to
 * a neutral chip that still shows the raw string (never throws / blanks).
 */
export function resolvePaymentStatus(status: string): StatusConfig {
	return (
		paymentStatusConfig[status] ?? { ...statusPresets.inert, label: status }
	);
}
