"use client";

import { SaveIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { CrudPageShell } from "~/features/admin/crud/_components/crud-page-shell";
import {
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { weeklyClosingScheduleSchema } from "~/schemas/weekly-closing.schemas";
import { getNextClosing, pad2 } from "~/shared/common/date.helpers";
import {
	formatClosingDate,
	WEEKDAYS_FROM_MONDAY,
	weekdayName,
} from "~/shared/common/weekly-closing";
import { api } from "~/trpc/react";

const pageTitle = "Cierre semanal";
const pageDescription =
	"El día y la hora en que, cada semana, se le dice al cliente que cierran los pedidos, y el plazo de entrega que se muestra desde ese cierre.";

type FormState = {
	weekday: string;
	time: string;
	deliveryDaysMin: string;
	deliveryDaysMax: string;
};

type FieldName = "closingWeekday" | "closingTime" | "deliveryDaysMax";

function capitalize(text: string) {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Blank or malformed inputs become NaN so the schema reports them. */
function toSchedule(form: FormState) {
	const [hour, minute] = form.time.split(":").map(Number);
	return {
		closingWeekday: Number(form.weekday),
		closingHour: form.time ? (hour ?? Number.NaN) : Number.NaN,
		closingMinute: form.time ? (minute ?? Number.NaN) : Number.NaN,
		deliveryDaysMin: form.deliveryDaysMin
			? Number(form.deliveryDaysMin)
			: Number.NaN,
		deliveryDaysMax: form.deliveryDaysMax
			? Number(form.deliveryDaysMax)
			: Number.NaN,
	};
}

function fieldOf(path: PropertyKey | undefined): FieldName {
	if (path === "closingWeekday") return "closingWeekday";
	if (path === "closingHour" || path === "closingMinute") return "closingTime";
	return "deliveryDaysMax";
}

export function WeeklyClosingClient() {
	const utils = api.useUtils();
	const settingsQuery = api.admin.weeklyClosing.getSettings.useQuery();

	const [form, setForm] = useState<FormState>({
		weekday: "3",
		time: "12:00",
		deliveryDaysMin: "7",
		deliveryDaysMax: "10",
	});
	const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});

	// A window-focus refetch hands back a new object for the same row; reseeding
	// on it would throw away unsaved edits, so only a newer save reseeds.
	const seededAt = useRef<number | null>(null);
	useEffect(() => {
		const settings = settingsQuery.data;
		if (!settings) return;
		const savedAt = settings.updatedAt.getTime();
		if (seededAt.current === savedAt) return;
		seededAt.current = savedAt;
		setForm({
			weekday: String(settings.closingWeekday),
			time: `${pad2(settings.closingHour)}:${pad2(settings.closingMinute)}`,
			deliveryDaysMin: String(settings.deliveryDaysMin),
			deliveryDaysMax: String(settings.deliveryDaysMax),
		});
	}, [settingsQuery.data]);

	const updateMutation = api.admin.weeklyClosing.updateSettings.useMutation({
		onSuccess: async () => {
			toast.success("Cierre semanal guardado");
			await utils.admin.weeklyClosing.getSettings.invalidate();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo guardar el cierre semanal");
		},
	});

	const update = (patch: Partial<FormState>) => {
		setForm((current) => ({ ...current, ...patch }));
		setErrors({});
	};

	const parsed = weeklyClosingScheduleSchema.safeParse(toSchedule(form));
	const nextClosing = parsed.success
		? formatClosingDate(getNextClosing(new Date(), parsed.data))
		: null;

	const save = () => {
		if (!parsed.success) {
			const fieldErrors: Partial<Record<FieldName, string>> = {};
			for (const issue of parsed.error.issues) {
				const field = fieldOf(issue.path[0]);
				fieldErrors[field] ??= issue.message;
			}
			setErrors(fieldErrors);
			return;
		}
		updateMutation.mutate(parsed.data);
	};

	if (settingsQuery.isLoading) {
		return (
			<CrudPageShell description={pageDescription} title={pageTitle}>
				<CrudLoadingState />
			</CrudPageShell>
		);
	}

	if (settingsQuery.isError) {
		return (
			<CrudPageShell description={pageDescription} title={pageTitle}>
				<CrudErrorState message={settingsQuery.error.message} />
			</CrudPageShell>
		);
	}

	return (
		<CrudPageShell description={pageDescription} title={pageTitle}>
			<Card>
				<CardHeader>
					<CardTitle>Configuración</CardTitle>
					<CardDescription>
						Solo informa al cliente: el contador de la tienda, el home y la
						ficha del producto. Las compras se siguen lanzando a mano desde
						Operaciones, después del cierre.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-5">
					<Field
						className="md:w-64"
						data-invalid={errors.closingWeekday ? true : undefined}
					>
						<FieldLabel htmlFor="weekly-closing-weekday">
							Día del cierre
						</FieldLabel>
						<Select
							id="weekly-closing-weekday"
							onChange={(event) => update({ weekday: event.target.value })}
							value={form.weekday}
						>
							{WEEKDAYS_FROM_MONDAY.map((weekday) => (
								<option key={weekday} value={weekday}>
									{capitalize(weekdayName(weekday))}
								</option>
							))}
						</Select>
						<FieldError>{errors.closingWeekday}</FieldError>
					</Field>

					<Field
						className="md:w-64"
						data-invalid={errors.closingTime ? true : undefined}
					>
						<FieldLabel htmlFor="weekly-closing-time">
							Hora del cierre
						</FieldLabel>
						<Input
							aria-invalid={errors.closingTime ? true : undefined}
							id="weekly-closing-time"
							onChange={(event) => update({ time: event.target.value })}
							step={60}
							type="time"
							value={form.time}
						/>
						<FieldDescription>Hora de Argentina.</FieldDescription>
						<FieldError>{errors.closingTime}</FieldError>
					</Field>

					<Field data-invalid={errors.deliveryDaysMax ? true : undefined}>
						<FieldLabel htmlFor="weekly-closing-days-min">
							Plazo de entrega
						</FieldLabel>
						<div className="flex items-center gap-2">
							<Input
								aria-invalid={errors.deliveryDaysMax ? true : undefined}
								aria-label="Plazo mínimo, en días"
								className="w-24"
								id="weekly-closing-days-min"
								inputMode="numeric"
								max={60}
								min={1}
								onChange={(event) =>
									update({ deliveryDaysMin: event.target.value })
								}
								type="number"
								value={form.deliveryDaysMin}
							/>
							<span>a</span>
							<Input
								aria-invalid={errors.deliveryDaysMax ? true : undefined}
								aria-label="Plazo máximo, en días"
								className="w-24"
								inputMode="numeric"
								max={60}
								min={1}
								onChange={(event) =>
									update({ deliveryDaysMax: event.target.value })
								}
								type="number"
								value={form.deliveryDaysMax}
							/>
							<span>días</span>
						</div>
						<FieldDescription>Contado desde el cierre.</FieldDescription>
						<FieldError>{errors.deliveryDaysMax}</FieldError>
					</Field>

					<p className="text-sm">
						{nextClosing ? (
							<>
								Próximo cierre:{" "}
								<span className="font-medium">{nextClosing}</span>
							</>
						) : (
							"Completá el día, la hora y el plazo para ver el próximo cierre."
						)}
					</p>

					<div>
						<Button
							disabled={updateMutation.isPending}
							onClick={save}
							variant="highlight"
						>
							<SaveIcon data-icon="inline-start" />
							Guardar
						</Button>
					</div>
				</CardContent>
			</Card>
		</CrudPageShell>
	);
}
