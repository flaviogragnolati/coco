import type {
	ComboDetail,
	ComboFormValues,
	ComboProductOption,
} from "~/shared/common/admin-crud/combo.types";
import {
	formatQuantity,
	formatQuantityInput,
	parseQuantityInput,
	toQuantityString,
} from "~/shared/common/commerce.helpers";

export const defaultComboFormValues: ComboFormValues = {
	name: "",
	description: null,
	people: null,
	groupName: null,
	active: true,
	items: [{ productId: 0, quantity: "" }],
};

/** Quantities are edited as the admin types them (es-AR, "0,5"). */
export function comboDetailToFormValues(combo: ComboDetail): ComboFormValues {
	return {
		name: combo.name,
		description: combo.description,
		people: combo.people,
		groupName: combo.groupName,
		active: combo.active,
		items: combo.items.map((item) => ({
			productId: item.productId,
			quantity: formatQuantityInput(item.quantity),
		})),
	};
}

/** The decimal string the server expects, or what was typed when unreadable. */
export function comboQuantityToSubmit(typed: string) {
	const parsed = parseQuantityInput(typed);
	return parsed === null ? typed.trim() : toQuantityString(parsed);
}

/** "Mínimo 1 kg, de a 0,5 kg", plus the cap when there is one. */
export function describeComboQuantityRule(option: ComboProductOption) {
	const presentation = {
		presentationContainer: option.presentationContainer,
		presentationSize: null,
	};
	const moq = formatQuantity(option.moq, option.unit, presentation);
	const step = formatQuantity(
		option.step ?? option.moq,
		option.unit,
		presentation,
	);
	const max = option.max
		? `, hasta ${formatQuantity(option.max, option.unit, presentation)}`
		: "";
	return option.step
		? `Mínimo ${moq}, de a ${step}${max}`
		: `Cantidad fija: ${moq}`;
}
