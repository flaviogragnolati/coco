import { z } from "zod";

export const operationalDiagnosticSeveritySchema = z.enum([
	"warning",
	"critical",
]);

export const operationalDiagnosticSchema = z.object({
	code: z.string(),
	severity: operationalDiagnosticSeveritySchema,
	message: z.string(),
	refs: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
});

export const diagnosticStateSchema = z
	.enum(["all", "withDiagnostics", "withoutDiagnostics"])
	.default("all");

export const highestDiagnosticSeveritySchema =
	operationalDiagnosticSeveritySchema.nullable();
