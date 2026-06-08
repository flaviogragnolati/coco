import { Prisma } from "~/prisma/client";

export type OperationSupplierTermCandidate = {
	id: number;
	supplierId: number;
	moq: Prisma.Decimal;
	step: Prisma.Decimal | null;
	max: Prisma.Decimal | null;
	fromDate: Date;
	toDate: Date | null;
	active: boolean;
	deleted: boolean;
	supplier: {
		id: number;
		name: string;
		active: boolean;
		deleted: boolean;
	};
};

export type OperationSupplierResolutionProduct = {
	name: string;
	defaultSupplierId: number | null;
	supplierTerms: OperationSupplierTermCandidate[];
};

function decimal(value: Prisma.Decimal | string | number) {
	return new Prisma.Decimal(value);
}

function isTermEffective(term: OperationSupplierTermCandidate, now: Date) {
	return (
		term.active &&
		!term.deleted &&
		term.supplier.active &&
		!term.supplier.deleted &&
		term.fromDate <= now &&
		(term.toDate === null || term.toDate >= now)
	);
}

export function resolveSupplierTermForProduct(
	product: OperationSupplierResolutionProduct,
	now: Date,
) {
	const effectiveTerms = product.supplierTerms.filter((term) =>
		isTermEffective(term, now),
	);
	const defaultSupplierId = product.defaultSupplierId;

	if (defaultSupplierId !== null) {
		const defaultTerms = effectiveTerms.filter(
			(term) => term.supplierId === defaultSupplierId,
		);
		if (defaultTerms.length === 1) return { term: defaultTerms[0] };
	}

	if (effectiveTerms.length === 1) return { term: effectiveTerms[0] };

	if (effectiveTerms.length === 0) {
		return {
			term: null,
			reason: `Sin termino de proveedor vigente para ${product.name}`,
		};
	}

	return {
		term: null,
		reason: `Proveedor ambiguo para ${product.name}: ${effectiveTerms
			.map((term) => term.supplier.name)
			.join(", ")}`,
	};
}

export function calculateAssignableQuantity(input: {
	quantity: Prisma.Decimal | string;
	moq: Prisma.Decimal | string;
	step: Prisma.Decimal | string | null;
	max: Prisma.Decimal | string | null;
}) {
	const quantity = decimal(input.quantity);
	const moq = decimal(input.moq);
	const max = input.max === null ? null : decimal(input.max);
	const step = input.step === null ? null : decimal(input.step);

	if (quantity.lt(moq)) return new Prisma.Decimal(0);

	const cappedQuantity = max !== null && quantity.gt(max) ? max : quantity;
	if (cappedQuantity.lt(moq)) return new Prisma.Decimal(0);
	if (step === null || step.lte(0)) return cappedQuantity;

	const extra = cappedQuantity.minus(moq);
	const steps = extra.div(step).floor();
	return moq.plus(steps.mul(step));
}
