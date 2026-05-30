import type {
	DestinationDetail,
	DestinationFormValues,
} from "~/shared/common/admin-crud/destination.types";

export const defaultDestinationFormValues: DestinationFormValues = {
	name: "",
	description: "",
	googleMapsUrl: "",
	active: true,
};

export function destinationDetailToFormValues(
	destination: DestinationDetail,
): DestinationFormValues {
	return {
		name: destination.name,
		description: destination.description ?? "",
		googleMapsUrl: destination.googleMapsUrl ?? "",
		active: destination.active,
	};
}
