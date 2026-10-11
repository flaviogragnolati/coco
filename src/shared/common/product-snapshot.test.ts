import { expect, test } from "vitest";
import { formatQuantity } from "./commerce.helpers";
import {
	readSnapshotQuantityUnit,
	withSnapshotPresentation,
} from "./product-snapshot";

const legacy = {
	source: "cart",
	product: { id: 3, name: "Aceite", unit: "piece" },
};

test("an old snapshot without presentation falls back to the unit label", () => {
	const { unit, presentation } = readSnapshotQuantityUnit(legacy);

	expect(formatQuantity("16", unit, presentation)).toBe("16 unidades");
});

test("a snapshot with presentation counts in its container", () => {
	const snapshot = withSnapshotPresentation(legacy, {
		presentationContainer: "botella",
		presentationSize: "0,5 L",
	});
	const { unit, presentation } = readSnapshotQuantityUnit(snapshot);

	expect(formatQuantity("2", unit, presentation)).toBe("2 botellas 0,5 L");
	expect(snapshot).toMatchObject({ source: "cart", product: { id: 3 } });
});

test("an unreadable snapshot degrades to a neutral unit", () => {
	expect(readSnapshotQuantityUnit(null)).toEqual({
		unit: "other",
		presentation: { presentationContainer: null, presentationSize: null },
	});
	expect(
		readSnapshotQuantityUnit({
			product: { unit: "kg", presentationContainer: "caja" },
		}).presentation.presentationContainer,
	).toBeNull();
});
