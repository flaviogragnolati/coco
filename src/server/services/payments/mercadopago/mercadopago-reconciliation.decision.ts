export type PaymentStatus =
	| "pending"
	| "inProcess"
	| "completed"
	| "failed"
	| "cancelled"
	| "refunded"
	| "chargedBack";

export function mapMercadoPagoPaymentStatus(
	status: string | undefined | null,
): PaymentStatus {
	switch (status) {
		case "approved":
			return "completed";
		case "authorized":
		case "in_process":
		case "in_mediation":
			return "inProcess";
		case "rejected":
			return "failed";
		case "cancelled":
			return "cancelled";
		case "refunded":
			return "refunded";
		case "charged_back":
			return "chargedBack";
		default:
			return "pending";
	}
}

export function shouldApplyMercadoPagoPaymentStatus(
	current: PaymentStatus,
	next: PaymentStatus,
) {
	if (current === next) return true;
	if (next === "refunded" || next === "chargedBack") return true;
	if (current === "refunded" || current === "chargedBack") return false;
	if (current === "completed") return false;
	if (next === "completed") return true;
	return true;
}

export function shouldSubmitOrderAfterMercadoPagoReconciliation(input: {
	completedAt: Date | null;
	status: PaymentStatus;
}) {
	return input.status === "completed" && input.completedAt === null;
}
