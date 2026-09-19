/**
 * Parameters a rerun actually runs with. Rerunning a completed operation
 * compensates it first, and that compensation reopens the roll overs it had
 * consumed; excluding roll overs from the new run would strand that demand, so
 * `includeRollOver` is forced on. `failed` and `cancelled` sources released
 * nothing and keep the operator's choice.
 */
export function rerunParameters<T extends { includeRollOver: boolean }>(
	sourceStatus: string,
	parameters: T,
): { parameters: T; forcedIncludeRollOver: boolean } {
	if (sourceStatus !== "completed" || parameters.includeRollOver) {
		return { parameters, forcedIncludeRollOver: false };
	}

	return {
		parameters: { ...parameters, includeRollOver: true },
		forcedIncludeRollOver: true,
	};
}
