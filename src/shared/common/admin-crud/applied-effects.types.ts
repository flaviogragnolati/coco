import type { z } from "zod";

import type {
	appliedEffectSchema,
	appliedEffectsSchema,
} from "~/schemas/admin/applied-effects.schemas";

export type AppliedEffect = z.output<typeof appliedEffectSchema>;
export type AppliedEffects = z.output<typeof appliedEffectsSchema>;
