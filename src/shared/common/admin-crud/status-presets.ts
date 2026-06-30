import {
	AlertTriangle,
	CheckCircle2,
	CircleDashed,
	Clock,
	type LucideIcon,
	XCircle,
} from "lucide-react";

import type { StatusVariant } from "./status-config";

/**
 * Admin status color convention — the single home of the rule that every
 * per-entity `*StatusConfig` map composes from. Spreading a preset and adding a
 * `label` keeps the whole admin reading consistently:
 *
 *   completed: { ...statusPresets.success, label: lotStatusLabelMap.completed }
 *
 * Convention:
 * - `success`    (green)  → terminal-ok            (completed, confirmed, received, delivered)
 * - `inProgress` (blue)   → normal in-progress     (pending, packing, inTransit, readyForX…)
 * - `attention`  (amber)  → needs-attention only   (delayed, exception, partiallyRolledOver)
 * - `failed`     (red)    → terminal-bad           (failed, cancelled, chargedBack, rejected)
 * - `inert`      (gray)   → inert / not-yet-started (draft, inCart, ignored)
 *
 * Reserve `success` for truly terminal-good states; "good but not done"
 * (confirmed-as-committed aside, readyForPackaging, packing…) stays `inProgress`.
 * This convention is trivially reversible (single-line preset tweaks), so it
 * lives here in lieu of an ADR.
 */
export type StatusPresetKey =
	| "success"
	| "inProgress"
	| "attention"
	| "failed"
	| "inert";

export const statusPresets: Record<
	StatusPresetKey,
	{ variant: StatusVariant; icon: LucideIcon }
> = {
	success: { variant: "success", icon: CheckCircle2 },
	inProgress: { variant: "info", icon: Clock },
	attention: { variant: "warning", icon: AlertTriangle },
	failed: { variant: "destructive", icon: XCircle },
	inert: { variant: "outline", icon: CircleDashed },
};
