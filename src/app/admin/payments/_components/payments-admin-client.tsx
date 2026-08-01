"use client";

import {
	CheckCircle2Icon,
	ClockIcon,
	LayersIcon,
	RefreshCcwIcon,
	SearchIcon,
	SettingsIcon,
	ShieldAlertIcon,
	ShieldCheckIcon,
	XCircleIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { CrudPageShell } from "~/features/admin/crud/_components/crud-page-shell";
import { CrudSortToggle } from "~/features/admin/crud/_components/crud-sort-toggle";
import {
	CrudEmptyState,
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { CrudStatsCards } from "~/features/admin/crud/_components/crud-stats-cards";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import { sortByDate } from "~/features/admin/crud/_lib/crud-list-sort";
import type {
	CrudColumn,
	CrudSortDirection,
} from "~/shared/common/admin-crud/crud.types";
import type {
	ExternalPaymentConfig,
	ExternalPaymentSettings,
	MercadoPagoSettings,
	PaymentAttemptDetail,
	PaymentAttemptListItem,
	PaymentAttemptRejectInput,
	PaymentAttemptSettleInput,
	PaymentEventDetail,
	PaymentEventListItem,
	PaymentProviderConfig,
} from "~/shared/common/admin-crud/payment.types";
import { formatCurrency } from "~/shared/common/commerce.helpers";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import { api } from "~/trpc/react";
import { resolvePaymentStatus } from "./payment.mappers";

const EXTERNAL_PROVIDER = "external";

const providerFilterOptions = [
	{ value: "all", label: "Todos" },
	{ value: "mercadopago", label: "Mercado Pago" },
	{ value: EXTERNAL_PROVIDER, label: "Pago externo" },
] as const;

type ProviderFilter = (typeof providerFilterOptions)[number]["value"];

function formatDate(value: Date | null) {
	return value ? formatDateTimeShort(value) : "Sin dato";
}

function JsonBlock({ value }: { value: unknown }) {
	return (
		<pre className="max-h-72 overflow-auto border bg-muted/30 p-3 text-xs">
			{JSON.stringify(value, null, 2)}
		</pre>
	);
}

function PaymentStatusBadge({ status }: { status: string }) {
	return <StatusChip config={resolvePaymentStatus(status)} />;
}

/**
 * The settle/reject pair only renders while the attempt is `pending`: a
 * successful action refetches the detail with its new status, which is what
 * clears these inputs (ADR 0010 — an external payment is settled by hand).
 */
function ExternalAttemptActions({
	attempt,
	onSettle,
	isSettling,
	onReject,
	isRejecting,
}: {
	attempt: PaymentAttemptDetail;
	onSettle: (input: PaymentAttemptSettleInput) => void;
	isSettling: boolean;
	onReject: (input: PaymentAttemptRejectInput) => void;
	isRejecting: boolean;
}) {
	const [receiptReference, setReceiptReference] = useState(
		attempt.declaredReceiptReference ?? "",
	);
	const [note, setNote] = useState("");
	const [reason, setReason] = useState("");
	const isBusy = isSettling || isRejecting;

	return (
		<div className="grid gap-3 md:grid-cols-2">
			<div className="flex flex-col gap-2 border p-3">
				<h3 className="font-medium text-sm">Marcar cobrado</h3>
				<p className="text-muted-foreground text-xs">
					Verificá la transferencia en el banco antes de liquidar: el pedido
					pasa a preparación y no se deshace solo.
				</p>
				<Input
					onChange={(event) => setReceiptReference(event.target.value)}
					placeholder="Referencia del comprobante"
					value={receiptReference}
				/>
				<Textarea
					onChange={(event) => setNote(event.target.value)}
					placeholder="Nota (opcional)"
					value={note}
				/>
				<Button
					disabled={isBusy || receiptReference.trim().length < 3}
					onClick={() =>
						onSettle({
							id: attempt.id,
							receiptReference: receiptReference.trim(),
							note: note.trim() || null,
						})
					}
					type="button"
				>
					<CheckCircle2Icon data-icon="inline-start" />
					Marcar cobrado
				</Button>
			</div>
			<div className="flex flex-col gap-2 border p-3">
				<h3 className="font-medium text-sm">Rechazar</h3>
				<p className="text-muted-foreground text-xs">
					El pedido queda como fallido y el usuario ve el motivo.
				</p>
				<Input
					onChange={(event) => setReason(event.target.value)}
					placeholder="Motivo del rechazo"
					value={reason}
				/>
				<Button
					className="mt-auto"
					disabled={isBusy || reason.trim().length < 5}
					onClick={() => onReject({ id: attempt.id, reason: reason.trim() })}
					type="button"
					variant="outline"
				>
					<XCircleIcon data-icon="inline-start" />
					Rechazar
				</Button>
			</div>
		</div>
	);
}

function AttemptDetail({
	attempt,
	onReconcile,
	isReconciling,
	onSettle,
	isSettling,
	onReject,
	isRejecting,
}: {
	attempt: PaymentAttemptDetail | null;
	onReconcile: (id: number) => void;
	isReconciling: boolean;
	onSettle: (input: PaymentAttemptSettleInput) => void;
	isSettling: boolean;
	onReject: (input: PaymentAttemptRejectInput) => void;
	isRejecting: boolean;
}) {
	if (!attempt) return null;

	const isExternal = attempt.provider === EXTERNAL_PROVIDER;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Detalle del intento #{attempt.id}</CardTitle>
				<CardDescription>
					{attempt.userOrder.code} · {attempt.userOrder.user.email}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="grid gap-3 md:grid-cols-3">
					<div className="border p-3 text-xs">
						<span className="text-muted-foreground">Idempotencia</span>
						<p className="break-all font-medium">{attempt.idempotencyKey}</p>
					</div>
					{isExternal ? (
						<>
							<div className="border p-3 text-xs">
								<span className="text-muted-foreground">
									Comprobante declarado
								</span>
								<p className="break-all font-medium">
									{attempt.declaredReceiptReference ?? "Sin declarar"}
								</p>
								<span className="text-muted-foreground">
									{attempt.declaredReceiptAt
										? formatDate(attempt.declaredReceiptAt)
										: "El usuario todavía no informó la transferencia"}
								</span>
							</div>
							<div className="border p-3 text-xs">
								<span className="text-muted-foreground">
									Referencia liquidada
								</span>
								<p className="break-all font-medium">
									{attempt.externalTransactionId ?? "Sin dato"}
								</p>
							</div>
						</>
					) : (
						<>
							<div className="border p-3 text-xs">
								<span className="text-muted-foreground">Preferencia</span>
								<p className="break-all font-medium">
									{attempt.providerPreferenceId ?? "Sin dato"}
								</p>
							</div>
							<div className="border p-3 text-xs">
								<span className="text-muted-foreground">Pago</span>
								<p className="break-all font-medium">
									{attempt.providerPaymentId ?? "Sin dato"}
								</p>
							</div>
						</>
					)}
				</div>
				{attempt.failureCode ? (
					<div className="border border-destructive/40 p-3 text-xs">
						<span className="text-muted-foreground">Falla / discrepancia</span>
						<p className="font-medium text-destructive">
							{attempt.failureCode}
						</p>
						{attempt.failureMessage ? (
							<p className="text-destructive">{attempt.failureMessage}</p>
						) : null}
					</div>
				) : null}
				{isExternal ? (
					attempt.status === "pending" ? (
						<ExternalAttemptActions
							attempt={attempt}
							isRejecting={isRejecting}
							isSettling={isSettling}
							key={attempt.id}
							onReject={onReject}
							onSettle={onSettle}
						/>
					) : (
						<p className="text-muted-foreground text-xs">
							El intento ya no está pendiente: no admite liquidación ni rechazo.
						</p>
					)
				) : (
					<div className="flex flex-wrap gap-2">
						<Button
							disabled={isReconciling || !attempt.providerPaymentId}
							onClick={() => onReconcile(attempt.id)}
							type="button"
						>
							<RefreshCcwIcon data-icon="inline-start" />
							Reconciliar ahora
						</Button>
						{attempt.checkoutUrl ? (
							<Button asChild type="button" variant="outline">
								<a href={attempt.checkoutUrl} rel="noreferrer" target="_blank">
									Abrir checkout
								</a>
							</Button>
						) : null}
					</div>
				)}
				<div className="grid gap-3 md:grid-cols-2">
					<div className="flex flex-col gap-2">
						<h3 className="font-medium text-sm">Request snapshot</h3>
						<JsonBlock value={attempt.requestSnapshot} />
					</div>
					<div className="flex flex-col gap-2">
						<h3 className="font-medium text-sm">Response snapshot</h3>
						<JsonBlock value={attempt.responseSnapshot} />
					</div>
				</div>
				<Separator />
				<div className="flex flex-col gap-2">
					<h3 className="font-medium text-sm">Eventos relacionados</h3>
					{attempt.events.length === 0 ? (
						<p className="text-muted-foreground text-xs">Sin eventos.</p>
					) : (
						<div className="grid gap-2">
							{attempt.events.map((event) => (
								<div className="grid gap-2 border p-3 text-xs" key={event.id}>
									<div className="flex items-center justify-between gap-3">
										<span>
											#{event.id} · {event.eventType ?? "sin tipo"} ·{" "}
											{event.providerResourceId ?? "sin recurso"}
										</span>
										<PaymentStatusBadge status={event.status} />
									</div>
									<span className="text-muted-foreground">
										{formatDate(event.receivedAt)} ·{" "}
										{event.signatureValid ? "firma válida" : "firma no válida"}
									</span>
									{event.lastError ? (
										<span className="text-destructive">{event.lastError}</span>
									) : null}
								</div>
							))}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

function EventDetail({
	event,
	ignoreReason,
	isIgnoring,
	isReprocessing,
	onIgnoreReasonChange,
	onIgnore,
	onReprocess,
}: {
	event: PaymentEventDetail | null;
	ignoreReason: string;
	isIgnoring: boolean;
	isReprocessing: boolean;
	onIgnoreReasonChange: (value: string) => void;
	onIgnore: (id: number) => void;
	onReprocess: (id: number) => void;
}) {
	if (!event) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Detalle del evento #{event.id}</CardTitle>
				<CardDescription>
					{event.eventType ?? "sin tipo"} ·{" "}
					{event.providerResourceId ?? "sin recurso"}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="flex flex-wrap gap-2">
					<Button
						disabled={
							isReprocessing || event.providerResourceType !== "payment"
						}
						onClick={() => onReprocess(event.id)}
						type="button"
					>
						<RefreshCcwIcon data-icon="inline-start" />
						Reprocesar
					</Button>
					<div className="flex min-w-72 flex-1 gap-2">
						<Input
							onChange={(inputEvent) =>
								onIgnoreReasonChange(inputEvent.target.value)
							}
							placeholder="Motivo para ignorar"
							value={ignoreReason}
						/>
						<Button
							disabled={isIgnoring || ignoreReason.trim().length < 5}
							onClick={() => onIgnore(event.id)}
							type="button"
							variant="outline"
						>
							Ignorar
						</Button>
					</div>
				</div>
				<div className="grid gap-3 md:grid-cols-3">
					<JsonBlock value={event.query} />
					<JsonBlock value={event.headers} />
					<JsonBlock value={event.payload} />
				</div>
			</CardContent>
		</Card>
	);
}

function ConfigEditor({
	config,
	onSubmit,
	isSaving,
}: {
	config: PaymentProviderConfig | undefined;
	onSubmit: (input: {
		enabled: boolean;
		mode: "sandbox" | "production";
		settings: MercadoPagoSettings;
		confirmation: string;
	}) => void;
	isSaving: boolean;
}) {
	const [enabled, setEnabled] = useState(false);
	const [mode, setMode] = useState<"sandbox" | "production">("sandbox");
	const [settings, setSettings] = useState<MercadoPagoSettings | null>(null);
	const [confirmation, setConfirmation] = useState("");

	useEffect(() => {
		if (!config) return;
		setEnabled(config.enabled);
		setMode(config.mode);
		setSettings(config.settings);
	}, [config]);

	if (!config || !settings) return <CrudLoadingState />;

	const setSetting = <K extends keyof MercadoPagoSettings>(
		key: K,
		value: MercadoPagoSettings[K],
	) =>
		setSettings((current) =>
			current ? { ...current, [key]: value } : current,
		);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<SettingsIcon />
					Configuración Mercado Pago
				</CardTitle>
				<CardDescription>
					Solo se muestran diagnósticos de secretos, nunca sus valores.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-5">
				<div className="grid gap-3 md:grid-cols-3">
					<div className="border p-3 text-xs">
						<span className="text-muted-foreground">Access token</span>
						<p>
							{config.diagnostics.accessTokenConfigured
								? "Configurado"
								: "Falta"}
						</p>
					</div>
					<div className="border p-3 text-xs">
						<span className="text-muted-foreground">Webhook secret</span>
						<p>
							{config.diagnostics.webhookSecretConfigured
								? "Configurado"
								: "Falta"}
						</p>
					</div>
					<div className="border p-3 text-xs">
						<span className="text-muted-foreground">APP_ENV</span>
						<p>{config.diagnostics.appEnv}</p>
					</div>
				</div>
				<FieldGroup className="grid gap-3 md:grid-cols-2">
					<Field orientation="horizontal">
						<FieldContent>
							<FieldLabel>Proveedor habilitado</FieldLabel>
							<FieldDescription>
								Permite mostrar Mercado Pago en checkout.
							</FieldDescription>
						</FieldContent>
						<Switch checked={enabled} onCheckedChange={setEnabled} />
					</Field>
					<Field>
						<FieldLabel htmlFor="mp-mode">Modo</FieldLabel>
						<Select
							id="mp-mode"
							onChange={(event) =>
								setMode(event.target.value as "sandbox" | "production")
							}
							value={mode}
						>
							<option value="sandbox">Sandbox</option>
							<option value="production">Producción</option>
						</Select>
					</Field>
					<Field>
						<FieldLabel htmlFor="mp-notification">Webhook</FieldLabel>
						<Input
							id="mp-notification"
							onChange={(event) =>
								setSetting("notificationUrl", event.target.value)
							}
							value={settings.notificationUrl}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="mp-success">URL éxito</FieldLabel>
						<Input
							id="mp-success"
							onChange={(event) =>
								setSetting("successBackUrl", event.target.value)
							}
							value={settings.successBackUrl}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="mp-failure">URL fallo</FieldLabel>
						<Input
							id="mp-failure"
							onChange={(event) =>
								setSetting("failureBackUrl", event.target.value)
							}
							value={settings.failureBackUrl}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="mp-pending">URL pendiente</FieldLabel>
						<Input
							id="mp-pending"
							onChange={(event) =>
								setSetting("pendingBackUrl", event.target.value)
							}
							value={settings.pendingBackUrl}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="mp-expiration">Expiración minutos</FieldLabel>
						<Input
							id="mp-expiration"
							min={1}
							onChange={(event) =>
								setSetting(
									"preferenceExpiresInMinutes",
									Number(event.target.value),
								)
							}
							type="number"
							value={settings.preferenceExpiresInMinutes}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="mp-statement">Descriptor</FieldLabel>
						<Input
							id="mp-statement"
							onChange={(event) =>
								setSetting("statementDescriptor", event.target.value || null)
							}
							value={settings.statementDescriptor ?? ""}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="mp-excluded-types">Tipos excluidos</FieldLabel>
						<Textarea
							id="mp-excluded-types"
							onChange={(event) =>
								setSetting(
									"excludedPaymentTypes",
									event.target.value
										.split(",")
										.map((item) => item.trim())
										.filter(Boolean),
								)
							}
							value={settings.excludedPaymentTypes.join(", ")}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="mp-excluded-methods">
							Métodos excluidos
						</FieldLabel>
						<Textarea
							id="mp-excluded-methods"
							onChange={(event) =>
								setSetting(
									"excludedPaymentMethods",
									event.target.value
										.split(",")
										.map((item) => item.trim())
										.filter(Boolean),
								)
							}
							value={settings.excludedPaymentMethods.join(", ")}
						/>
					</Field>
				</FieldGroup>
				<div className="grid gap-3 md:grid-cols-3">
					<Field orientation="horizontal">
						<FieldContent>
							<FieldLabel>Auto return approved</FieldLabel>
						</FieldContent>
						<Switch
							checked={settings.autoReturnApproved}
							onCheckedChange={(value) =>
								setSetting("autoReturnApproved", value)
							}
						/>
					</Field>
					<Field orientation="horizontal">
						<FieldContent>
							<FieldLabel>Binary mode</FieldLabel>
						</FieldContent>
						<Switch
							checked={settings.binaryMode}
							onCheckedChange={(value) => setSetting("binaryMode", value)}
						/>
					</Field>
					<Field orientation="horizontal">
						<FieldContent>
							<FieldLabel>Webhooks unsigned dev</FieldLabel>
						</FieldContent>
						<Switch
							checked={settings.allowUnsignedWebhooksInDevelopment}
							onCheckedChange={(value) =>
								setSetting("allowUnsignedWebhooksInDevelopment", value)
							}
						/>
					</Field>
				</div>
				<Field>
					<FieldLabel htmlFor="mp-confirmation">Confirmación</FieldLabel>
					<Input
						id="mp-confirmation"
						onChange={(event) => setConfirmation(event.target.value)}
						placeholder="CONFIRMAR"
						value={confirmation}
					/>
				</Field>
				<div className="flex justify-end">
					<Button
						disabled={isSaving}
						onClick={() => onSubmit({ enabled, mode, settings, confirmation })}
						type="button"
					>
						Guardar configuración
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function ExternalConfigEditor({
	config,
	onSubmit,
	isSaving,
}: {
	config: ExternalPaymentConfig | undefined;
	onSubmit: (input: {
		enabled: boolean;
		settings: ExternalPaymentSettings;
	}) => void;
	isSaving: boolean;
}) {
	const [enabled, setEnabled] = useState(false);
	const [settings, setSettings] = useState<ExternalPaymentSettings | null>(
		null,
	);

	useEffect(() => {
		if (!config) return;
		setEnabled(config.enabled);
		setSettings(config.settings);
	}, [config]);

	if (!config || !settings) return <CrudLoadingState />;

	const setSetting = <K extends keyof ExternalPaymentSettings>(
		key: K,
		value: ExternalPaymentSettings[K],
	) =>
		setSettings((current) =>
			current ? { ...current, [key]: value } : current,
		);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<SettingsIcon />
					Configuración pago externo
				</CardTitle>
				<CardDescription>
					Datos de transferencia que ve el usuario al elegir pago externo. Cada
					cobro lo liquida un admin a mano.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-5">
				<FieldGroup className="grid gap-3 md:grid-cols-2">
					<Field orientation="horizontal">
						<FieldContent>
							<FieldLabel>Proveedor habilitado</FieldLabel>
							<FieldDescription>
								Permite mostrar Pago externo en checkout.
							</FieldDescription>
						</FieldContent>
						<Switch checked={enabled} onCheckedChange={setEnabled} />
					</Field>
					<Field>
						<FieldLabel htmlFor="external-expiration">
							Vencimiento en horas
						</FieldLabel>
						<Input
							id="external-expiration"
							min={1}
							onChange={(event) =>
								setSetting("expiresInHours", Number(event.target.value))
							}
							type="number"
							value={settings.expiresInHours}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="external-holder">Titular</FieldLabel>
						<Input
							id="external-holder"
							onChange={(event) =>
								setSetting("accountHolder", event.target.value)
							}
							value={settings.accountHolder}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="external-bank">Banco</FieldLabel>
						<Input
							id="external-bank"
							onChange={(event) => setSetting("bankName", event.target.value)}
							value={settings.bankName}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="external-cbu">CBU</FieldLabel>
						<Input
							id="external-cbu"
							onChange={(event) => setSetting("cbu", event.target.value)}
							value={settings.cbu}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="external-alias">Alias</FieldLabel>
						<Input
							id="external-alias"
							onChange={(event) =>
								setSetting("alias", event.target.value || null)
							}
							value={settings.alias ?? ""}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="external-tax-id">CUIT</FieldLabel>
						<Input
							id="external-tax-id"
							onChange={(event) =>
								setSetting("taxId", event.target.value || null)
							}
							value={settings.taxId ?? ""}
						/>
					</Field>
				</FieldGroup>
				<Field>
					<FieldLabel htmlFor="external-instructions">Instrucciones</FieldLabel>
					<Textarea
						id="external-instructions"
						onChange={(event) =>
							setSetting("instructions", event.target.value || null)
						}
						value={settings.instructions ?? ""}
					/>
					<FieldDescription>
						Texto libre que acompaña los datos de transferencia.
					</FieldDescription>
				</Field>
				<div className="flex justify-end">
					<Button
						disabled={isSaving}
						onClick={() => onSubmit({ enabled, settings })}
						type="button"
					>
						Guardar configuración
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

export function PaymentsAdminClient() {
	const [search, setSearch] = useState("");
	const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(
		null,
	);
	const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
	const [ignoreReason, setIgnoreReason] = useState("");
	const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
	const [sortDirection, setSortDirection] = useState<CrudSortDirection>("desc");
	const utils = api.useUtils();

	const listInput = useMemo(
		() => ({
			// "Todos" is the absence of the filter, not an empty provider name.
			provider: providerFilter === "all" ? undefined : providerFilter,
			search: search.trim() || undefined,
		}),
		[providerFilter, search],
	);
	const attemptsQuery = api.admin.payment.listAttempts.useQuery(listInput);
	const eventsQuery = api.admin.payment.listEvents.useQuery(listInput);
	const statsQuery = api.admin.payment.getAttemptStats.useQuery();
	const configQuery = api.admin.payment.getProviderConfig.useQuery();
	const externalConfigQuery = api.admin.payment.getExternalConfig.useQuery();
	const attemptDetailQuery = api.admin.payment.getAttemptById.useQuery(
		{ id: selectedAttemptId ?? 0 },
		{ enabled: selectedAttemptId !== null },
	);
	const eventDetailQuery = api.admin.payment.getEventById.useQuery(
		{ id: selectedEventId ?? 0 },
		{ enabled: selectedEventId !== null },
	);

	// Both lists arrive unpaginated, so the toggle sorts them in memory.
	const sortedAttempts = useMemo(
		() =>
			sortByDate(
				attemptsQuery.data ?? [],
				sortDirection,
				(attempt) => attempt.createdAt,
				(attempt) => attempt.id,
			),
		[attemptsQuery.data, sortDirection],
	);
	const sortedEvents = useMemo(
		() =>
			sortByDate(
				eventsQuery.data ?? [],
				sortDirection,
				(event) => event.receivedAt,
				(event) => event.id,
			),
		[eventsQuery.data, sortDirection],
	);

	const invalidatePayments = async () => {
		await Promise.all([
			utils.admin.payment.listAttempts.invalidate(),
			utils.admin.payment.listEvents.invalidate(),
			utils.admin.payment.getAttemptStats.invalidate(),
			utils.admin.payment.getAttemptById.invalidate(),
			utils.admin.payment.getEventById.invalidate(),
			utils.admin.payment.getProviderConfig.invalidate(),
			utils.admin.payment.getExternalConfig.invalidate(),
		]);
	};

	const reconcileMutation = api.admin.payment.reconcileAttempt.useMutation({
		onError: (error) => toast.error(error.message),
		onSuccess: async () => {
			toast.success("Intento reconciliado");
			await invalidatePayments();
		},
	});
	const reprocessMutation = api.admin.payment.reprocessEvent.useMutation({
		onError: (error) => toast.error(error.message),
		onSuccess: async () => {
			toast.success("Evento reprocesado");
			await invalidatePayments();
		},
	});
	const ignoreMutation = api.admin.payment.ignoreEvent.useMutation({
		onError: (error) => toast.error(error.message),
		onSuccess: async () => {
			toast.success("Evento ignorado");
			setIgnoreReason("");
			await invalidatePayments();
		},
	});
	const settleMutation = api.admin.payment.settleExternalAttempt.useMutation({
		onError: (error) => toast.error(error.message),
		onSuccess: async () => {
			toast.success("Pago externo marcado como cobrado");
			await invalidatePayments();
		},
	});
	const rejectMutation = api.admin.payment.rejectExternalAttempt.useMutation({
		onError: (error) => toast.error(error.message),
		onSuccess: async () => {
			toast.success("Pago externo rechazado");
			await invalidatePayments();
		},
	});
	const updateConfigMutation =
		api.admin.payment.updateProviderConfig.useMutation({
			onError: (error) => toast.error(error.message),
			onSuccess: async () => {
				toast.success("Configuración actualizada");
				await invalidatePayments();
			},
		});
	const updateExternalConfigMutation =
		api.admin.payment.updateExternalConfig.useMutation({
			onError: (error) => toast.error(error.message),
			onSuccess: async () => {
				toast.success("Configuración de pago externo actualizada");
				await invalidatePayments();
			},
		});

	const attemptColumns: CrudColumn<PaymentAttemptListItem>[] = [
		{
			key: "order",
			header: "Pedido",
			cell: (item) => (
				<div className="flex flex-col gap-1">
					<span className="font-medium">{item.userOrder.code}</span>
					<span className="text-muted-foreground text-xs">
						{item.userOrder.user.email}
					</span>
				</div>
			),
		},
		{
			key: "amount",
			header: "Monto",
			cell: (item) => formatCurrency(item.amount, item.currency),
		},
		{
			key: "status",
			header: "Estado",
			cell: (item) => <PaymentStatusBadge status={item.status} />,
		},
		{
			key: "provider",
			header: "Proveedor",
			cell: (item) => (
				<span className="text-xs">
					{item.provider} · {item.providerMode ?? "sin modo"}
				</span>
			),
		},
		{
			key: "refs",
			header: "Refs",
			cell: (item) => (
				<span className="break-all text-xs">
					{item.providerPaymentId ?? item.providerPreferenceId ?? "Sin ref."}
				</span>
			),
		},
		{
			key: "updated",
			header: "Actualizado",
			cell: (item) => formatDate(item.updatedAt),
		},
	];

	const eventColumns: CrudColumn<PaymentEventListItem>[] = [
		{
			key: "event",
			header: "Evento",
			cell: (item) => (
				<div className="flex flex-col gap-1">
					<span className="font-medium">{item.eventType ?? "sin tipo"}</span>
					<span className="text-muted-foreground text-xs">
						{item.action ?? "sin acción"}
					</span>
				</div>
			),
		},
		{
			key: "resource",
			header: "Recurso",
			cell: (item) => (
				<span className="break-all text-xs">
					{item.providerResourceType ?? "sin tipo"} ·{" "}
					{item.providerResourceId ?? "sin id"}
				</span>
			),
		},
		{
			key: "status",
			header: "Estado",
			cell: (item) => <PaymentStatusBadge status={item.status} />,
		},
		{
			key: "signature",
			header: "Firma",
			cell: (item) => (
				<StatusChip
					config={
						item.signatureValid
							? { label: "válida", variant: "success", icon: ShieldCheckIcon }
							: {
									label: "no válida",
									variant: "destructive",
									icon: ShieldAlertIcon,
								}
					}
				/>
			),
		},
		{
			key: "attempt",
			header: "Intento",
			cell: (item) =>
				item.userTransaction ? `#${item.userTransaction.id}` : "Sin vincular",
		},
		{
			key: "received",
			header: "Recibido",
			cell: (item) => formatDate(item.receivedAt),
		},
	];

	return (
		<CrudPageShell
			description="Trazabilidad de intentos de pago, eventos de proveedor, liquidación de pagos externos y configuración de proveedores."
			title="Pagos"
		>
			{statsQuery.data ? (
				<CrudStatsCards
					stats={[
						{
							label: "Intentos",
							value: statsQuery.data.totalAttempts,
							icon: LayersIcon,
						},
						{
							label: "Pendientes",
							value: statsQuery.data.pendingAttempts,
							icon: ClockIcon,
							accent: "info",
						},
						{
							label: "Completados",
							value: statsQuery.data.completedAttempts,
							icon: CheckCircle2Icon,
							accent: "success",
						},
						{
							label: "Eventos fallidos",
							value: statsQuery.data.failedEvents,
							icon: XCircleIcon,
							accent: "destructive",
						},
					]}
				/>
			) : null}
			<div className="flex flex-col gap-3 rounded-2xl border p-3 lg:flex-row lg:items-end lg:justify-between">
				<div className="flex flex-col gap-3 lg:flex-1 lg:flex-row lg:items-end">
					<Field>
						<FieldLabel htmlFor="payment-search">Buscar</FieldLabel>
						<div className="relative">
							<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
							<Input
								className="pl-8"
								id="payment-search"
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Pedido, email, preferencia, pago o request id"
								value={search}
							/>
						</div>
					</Field>
					<Field className="lg:max-w-56">
						<FieldLabel htmlFor="payment-provider">Proveedor</FieldLabel>
						<Select
							id="payment-provider"
							onChange={(event) =>
								setProviderFilter(event.target.value as ProviderFilter)
							}
							value={providerFilter}
						>
							{providerFilterOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</Select>
					</Field>
				</div>
				<CrudSortToggle onChange={setSortDirection} value={sortDirection} />
			</div>
			<Tabs defaultValue="attempts">
				<TabsList>
					<TabsTrigger value="attempts">Intentos</TabsTrigger>
					<TabsTrigger value="events">Eventos</TabsTrigger>
					<TabsTrigger value="config">Config</TabsTrigger>
					<TabsTrigger value="external-config">Pago externo</TabsTrigger>
				</TabsList>
				<TabsContent className="flex flex-col gap-4" value="attempts">
					{attemptsQuery.isLoading ? <CrudLoadingState /> : null}
					{attemptsQuery.isError ? (
						<CrudErrorState message={attemptsQuery.error.message} />
					) : null}
					{attemptsQuery.data?.length === 0 ? (
						<CrudEmptyState
							description="Cuando checkout cree preferencias, los intentos aparecerán acá."
							title="Sin intentos de pago"
						/>
					) : null}
					{sortedAttempts.length > 0 ? (
						<CrudTable
							columns={attemptColumns}
							getRowKey={(item) => item.id}
							items={sortedAttempts}
							onRowClick={(item) => setSelectedAttemptId(item.id)}
						/>
					) : null}
					<AttemptDetail
						attempt={attemptDetailQuery.data ?? null}
						isReconciling={reconcileMutation.isPending}
						isRejecting={rejectMutation.isPending}
						isSettling={settleMutation.isPending}
						onReconcile={(id) => reconcileMutation.mutate({ id })}
						onReject={(input) => rejectMutation.mutate(input)}
						onSettle={(input) => settleMutation.mutate(input)}
					/>
				</TabsContent>
				<TabsContent className="flex flex-col gap-4" value="events">
					{eventsQuery.isLoading ? <CrudLoadingState /> : null}
					{eventsQuery.isError ? (
						<CrudErrorState message={eventsQuery.error.message} />
					) : null}
					{eventsQuery.data?.length === 0 ? (
						<CrudEmptyState
							description="Los webhooks recibidos se listarán en esta tabla."
							title="Sin eventos de proveedor"
						/>
					) : null}
					{sortedEvents.length > 0 ? (
						<CrudTable
							columns={eventColumns}
							getRowKey={(item) => item.id}
							items={sortedEvents}
							onRowClick={(item) => setSelectedEventId(item.id)}
						/>
					) : null}
					<EventDetail
						event={eventDetailQuery.data ?? null}
						ignoreReason={ignoreReason}
						isIgnoring={ignoreMutation.isPending}
						isReprocessing={reprocessMutation.isPending}
						onIgnore={(id) =>
							ignoreMutation.mutate({ id, reason: ignoreReason })
						}
						onIgnoreReasonChange={setIgnoreReason}
						onReprocess={(id) => reprocessMutation.mutate({ id })}
					/>
				</TabsContent>
				<TabsContent value="config">
					{configQuery.isError ? (
						<CrudErrorState message={configQuery.error.message} />
					) : (
						<ConfigEditor
							config={configQuery.data}
							isSaving={updateConfigMutation.isPending}
							onSubmit={(input) => updateConfigMutation.mutate(input)}
						/>
					)}
				</TabsContent>
				<TabsContent value="external-config">
					{externalConfigQuery.isError ? (
						<CrudErrorState message={externalConfigQuery.error.message} />
					) : (
						<ExternalConfigEditor
							config={externalConfigQuery.data}
							isSaving={updateExternalConfigMutation.isPending}
							onSubmit={(input) => updateExternalConfigMutation.mutate(input)}
						/>
					)}
				</TabsContent>
			</Tabs>
		</CrudPageShell>
	);
}
