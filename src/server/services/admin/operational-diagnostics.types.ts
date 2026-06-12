import { Prisma } from "~/prisma/client";
import type {
	OperationalDiagnostic,
	OperationalDiagnosticSeverity,
} from "~/shared/common/admin-crud/operational-diagnostic.types";

export type { OperationalDiagnostic, OperationalDiagnosticSeverity };

export const zeroDecimal = () => new Prisma.Decimal(0);

export function decimal(
	value: Prisma.Decimal | string | number | null | undefined,
): Prisma.Decimal {
	if (value === null || value === undefined) return zeroDecimal();
	if (Prisma.Decimal.isDecimal(value)) return value;
	return new Prisma.Decimal(value);
}

export function sumDecimals(
	values: Array<Prisma.Decimal | string | number | null | undefined>,
): Prisma.Decimal {
	return values.reduce<Prisma.Decimal>(
		(sum, value) => sum.plus(decimal(value)),
		zeroDecimal(),
	);
}

export function severityRank(severity: OperationalDiagnosticSeverity) {
	return severity === "critical" ? 2 : 1;
}

export function highestSeverity(diagnostics: OperationalDiagnostic[]) {
	return diagnostics.reduce<OperationalDiagnosticSeverity | null>(
		(highest, diagnostic) => {
			if (highest === null) return diagnostic.severity;
			return severityRank(diagnostic.severity) > severityRank(highest)
				? diagnostic.severity
				: highest;
		},
		null,
	);
}

export function diagnosticMessages(diagnostics: OperationalDiagnostic[]) {
	return diagnostics
		.slice()
		.sort(
			(left, right) =>
				severityRank(right.severity) - severityRank(left.severity),
		)
		.slice(0, 2)
		.map((diagnostic) => diagnostic.message);
}

export function paginate<T>(
	items: T[],
	input: { page: number; pageSize: number },
) {
	const total = items.length;
	const pageCount = total === 0 ? 0 : Math.ceil(total / input.pageSize);
	const start = (input.page - 1) * input.pageSize;

	return {
		items: items.slice(start, start + input.pageSize),
		page: input.page,
		pageSize: input.pageSize,
		total,
		pageCount,
	};
}

export function matchesDiagnosticState(
	diagnosticCount: number,
	state: "all" | "withDiagnostics" | "withoutDiagnostics",
) {
	if (state === "withDiagnostics") return diagnosticCount > 0;
	if (state === "withoutDiagnostics") return diagnosticCount === 0;
	return true;
}
