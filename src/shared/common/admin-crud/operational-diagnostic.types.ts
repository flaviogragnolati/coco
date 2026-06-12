import type { z } from "zod";

import type {
	diagnosticStateSchema,
	operationalDiagnosticSchema,
	operationalDiagnosticSeveritySchema,
} from "~/schemas/admin/operational-diagnostic.schemas";

export type OperationalDiagnosticSeverity = z.output<
	typeof operationalDiagnosticSeveritySchema
>;
export type OperationalDiagnostic = z.output<
	typeof operationalDiagnosticSchema
>;
export type DiagnosticState = z.output<typeof diagnosticStateSchema>;
