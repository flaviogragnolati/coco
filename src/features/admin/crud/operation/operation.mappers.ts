import type {
	OperationCreateFormValues,
	OperationStatus,
	OperationStrategy,
} from "~/shared/common/admin-crud/operation.types";

export function toDateTimeLocalValue(value: Date | string) {
	const date = new Date(value);
	const pad = (part: number) => String(part).padStart(2, "0");

	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const operationStatusLabelMap: Record<OperationStatus, string> = {
	running: "En ejecucion",
	completed: "Completada",
	failed: "Fallida",
};

export const operationStrategyLabelMap: Record<OperationStrategy, string> = {
	fifo: "FIFO",
	other: "Otra",
};

export const operationStatusOptions = Object.entries(
	operationStatusLabelMap,
).map(([value, label]) => ({
	value: value as OperationStatus,
	label,
}));

export const defaultOperationCreateFormValues = (
	destinationId = 0,
): OperationCreateFormValues => {
	const now = new Date();
	const from = new Date(now);
	from.setDate(from.getDate() - 1);

	return {
		from: toDateTimeLocalValue(from),
		to: toDateTimeLocalValue(now),
		destinationId,
		includeRollOver: true,
		strategy: "fifo",
		notes: undefined,
	};
};
