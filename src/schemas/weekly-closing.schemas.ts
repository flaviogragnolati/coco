import { z } from "zod";

// Same ranges as the `weekly_closing_settings_values_check` constraint.
export const weeklyClosingScheduleObjectSchema = z.object({
	closingWeekday: z
		.number()
		.int("Elegí un día de la semana")
		.min(0, "Elegí un día de la semana")
		.max(6, "Elegí un día de la semana"),
	closingHour: z
		.number()
		.int("La hora debe ser un número entero")
		.min(0, "La hora va de 0 a 23")
		.max(23, "La hora va de 0 a 23"),
	closingMinute: z
		.number()
		.int("Los minutos deben ser un número entero")
		.min(0, "Los minutos van de 0 a 59")
		.max(59, "Los minutos van de 0 a 59"),
	deliveryDaysMin: z
		.number()
		.int("El plazo debe ser un número entero de días")
		.min(1, "El plazo mínimo es de 1 día")
		.max(60, "El plazo no puede pasar de 60 días"),
	deliveryDaysMax: z
		.number()
		.int("El plazo debe ser un número entero de días")
		.min(1, "El plazo mínimo es de 1 día")
		.max(60, "El plazo no puede pasar de 60 días"),
});

export const weeklyClosingScheduleSchema =
	weeklyClosingScheduleObjectSchema.refine(
		(schedule) => schedule.deliveryDaysMin <= schedule.deliveryDaysMax,
		{
			message: "El máximo no puede ser menor que el mínimo",
			path: ["deliveryDaysMax"],
		},
	);
