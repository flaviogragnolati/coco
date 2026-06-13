"use client";

import {
	ArrowLeftIcon,
	RefreshCcwIcon,
	SearchIcon,
	SettingsIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
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
import {
	CrudEmptyState,
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { CrudStatsCards } from "~/features/admin/crud/_components/crud-stats-cards";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type { CrudColumn } from "~/shared/common/admin-crud/crud.types";
import type {
	MercadoPagoSettings,
	PaymentAttemptDetail,
	PaymentAttemptListItem,
	PaymentEventDetail,
	PaymentEventListItem,
	PaymentProviderConfig,
} from "~/shared/common/admin-crud/payment.types";
import { formatCurrency } from "~/shared/common/commerce.helpers";
import { api } from "~/trpc/react";

const provider = "mercadopago";

function formatDate(value: Date | null) {
	return value
		? new Intl.DateTimeFormat("es-AR", {
				dateStyle: "short",
				timeStyle: "short",
			}).format(value)
		: "Sin dato";
}

function JsonBlock({ value }: { value: unknown }) {
	return (
		<pre className="max-h-72 overflow-auto border bg-muted/30 p-3 text-xs">
			{JSON.stringify(value, null, 2)}
		</pre>
	);
}

function PaymentStatusBadge({ status }: { status: string }) {
	const variant =
		status === "completed" || status === "processed"
			? "secondary"
			: status === "failed" ||
					status === "cancelled" ||
					status === "chargedBack" ||
					status === "rejected"
				? "destructive"
				: "outline";

	return <Badge variant={variant}>{status}</Badge>;
}

function AttemptDetail({
	attempt,
	onReconcile,
	isReconciling,
}: {
	attempt: PaymentAttemptDetail | null;
	onReconcile: (id: number) => void;
	isReconciling: boolean;
}) {
	if (!attempt) return null;

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
				</div>
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

export function PaymentsAdminClient() {
	const [search, setSearch] = useState("");
	const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(
		null,
	);
	const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
	const [ignoreReason, setIgnoreReason] = useState("");
	const utils = api.useUtils();

	const listInput = useMemo(
		() => ({ provider, search: search.trim() || undefined }),
		[search],
	);
	const attemptsQuery = api.admin.payment.listAttempts.useQuery(listInput);
	const eventsQuery = api.admin.payment.listEvents.useQuery(listInput);
	const statsQuery = api.admin.payment.getAttemptStats.useQuery();
	const configQuery = api.admin.payment.getProviderConfig.useQuery();
	const attemptDetailQuery = api.admin.payment.getAttemptById.useQuery(
		{ id: selectedAttemptId ?? 0 },
		{ enabled: selectedAttemptId !== null },
	);
	const eventDetailQuery = api.admin.payment.getEventById.useQuery(
		{ id: selectedEventId ?? 0 },
		{ enabled: selectedEventId !== null },
	);

	const invalidatePayments = async () => {
		await Promise.all([
			utils.admin.payment.listAttempts.invalidate(),
			utils.admin.payment.listEvents.invalidate(),
			utils.admin.payment.getAttemptStats.invalidate(),
			utils.admin.payment.getAttemptById.invalidate(),
			utils.admin.payment.getEventById.invalidate(),
			utils.admin.payment.getProviderConfig.invalidate(),
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
	const updateConfigMutation =
		api.admin.payment.updateProviderConfig.useMutation({
			onError: (error) => toast.error(error.message),
			onSuccess: async () => {
				toast.success("Configuración actualizada");
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
				<Badge variant={item.signatureValid ? "secondary" : "outline"}>
					{item.signatureValid ? "válida" : "no válida"}
				</Badge>
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
			actions={
				<Button asChild variant="outline">
					<Link href="/admin">
						<ArrowLeftIcon data-icon="inline-start" />
						Admin
					</Link>
				</Button>
			}
			description="Trazabilidad de intentos de pago, eventos de proveedor y configuración de Mercado Pago."
			title="Pagos"
		>
			{statsQuery.data ? (
				<CrudStatsCards
					stats={[
						{ label: "Intentos", value: statsQuery.data.totalAttempts },
						{ label: "Pendientes", value: statsQuery.data.pendingAttempts },
						{ label: "Completados", value: statsQuery.data.completedAttempts },
						{ label: "Eventos fallidos", value: statsQuery.data.failedEvents },
					]}
				/>
			) : null}
			<div className="rounded-none border p-3">
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
			</div>
			<Tabs defaultValue="attempts">
				<TabsList>
					<TabsTrigger value="attempts">Intentos</TabsTrigger>
					<TabsTrigger value="events">Eventos</TabsTrigger>
					<TabsTrigger value="config">Config</TabsTrigger>
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
					{attemptsQuery.data && attemptsQuery.data.length > 0 ? (
						<CrudTable
							columns={attemptColumns}
							getRowKey={(item) => item.id}
							items={attemptsQuery.data}
							onRowClick={(item) => setSelectedAttemptId(item.id)}
						/>
					) : null}
					<AttemptDetail
						attempt={attemptDetailQuery.data ?? null}
						isReconciling={reconcileMutation.isPending}
						onReconcile={(id) => reconcileMutation.mutate({ id })}
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
					{eventsQuery.data && eventsQuery.data.length > 0 ? (
						<CrudTable
							columns={eventColumns}
							getRowKey={(item) => item.id}
							items={eventsQuery.data}
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
			</Tabs>
		</CrudPageShell>
	);
}
