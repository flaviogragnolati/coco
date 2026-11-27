"use client";

import {
	ArrowDownIcon,
	ArrowUpIcon,
	SaveIcon,
	TriangleAlertIcon,
	XIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Combobox, type ComboboxOption } from "~/components/ui/combobox";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import { CrudPageShell } from "~/features/admin/crud/_components/crud-page-shell";
import {
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { featuredStatusChipConfig } from "~/features/admin/crud/home-offers/home-offers.mappers";
import { findOverflowingFeatured } from "~/features/admin/crud/home-offers/home-offers-placement";
import type {
	FeaturedTargetInput,
	HomeComboCandidate,
	HomeFeaturedPreview,
	HomeOffersCriterion,
} from "~/shared/common/admin-crud/home-offers.types";
import { api } from "~/trpc/react";
import { HomePreviewFrame } from "./home-preview-frame";

const PAGE_TITLE = "Destacados";
const PAGE_DESCRIPTION =
	"Elegí qué combos y productos se ven en el home y qué va en la banda destacada.";
const SPOTLIGHT_NONE = "none";

const criterionOptions: Array<{
	value: HomeOffersCriterion;
	label: string;
	description: string;
}> = [
	{
		value: "marketSaving",
		label: "Ahorro vs. góndola",
		description:
			"Ordena por la plata que el cliente ahorra sobre el precio de góndola, en todo el MOQ.",
	},
	{
		value: "discountPercent",
		label: "Descuento (%)",
		description:
			"Ordena por el porcentaje de descuento cargado en los términos.",
	},
	{
		value: "orderVolume",
		label: "Pedidos (90 días)",
		description:
			"Ordena por la cantidad de pedidos pagados que incluyeron el producto en los últimos 90 días.",
	},
];

function targetValue(target: FeaturedTargetInput | null) {
	if (!target) return SPOTLIGHT_NONE;
	return target.kind === "product"
		? `product:${target.productId}`
		: `combo:${target.comboId}`;
}

function parseTargetValue(value: string): FeaturedTargetInput | null {
	const [kind, rawId] = value.split(":");
	const id = Number(rawId);
	if (!Number.isInteger(id) || id <= 0) return null;
	if (kind === "product") return { kind: "product", productId: id };
	if (kind === "combo") return { kind: "combo", comboId: id };
	return null;
}

function comboLabel(combo: HomeComboCandidate) {
	const details = [
		combo.groupName,
		combo.people === null
			? null
			: `${combo.people} persona${combo.people === 1 ? "" : "s"}`,
	].filter(Boolean);
	return details.length > 0
		? `${combo.name} (${details.join(", ")})`
		: combo.name;
}

function previewSummary(preview: HomeFeaturedPreview) {
	const band = preview.spotlight
		? `Banda: ${preview.spotlight.name} (${preview.spotlight.source === "list" ? "elegida" : "del ranking"})`
		: "Sin banda";
	if (preview.featured.length === 0) return `${band} · La sección queda vacía`;

	const fromList = preview.featured.filter(
		(entry) => entry.source === "list",
	).length;
	const fromRanking = preview.featured.length - fromList;
	return `${band} · Sección: ${fromList} de la lista y ${fromRanking} del ranking`;
}

function RowIconButton({
	label,
	disabled,
	onClick,
	children,
}: {
	label: string;
	disabled: boolean;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					aria-label={label}
					disabled={disabled}
					onClick={onClick}
					size="icon"
					variant="ghost"
				>
					{children}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

export function HomeOffersClient() {
	const utils = api.useUtils();

	const settingsQuery = api.admin.homeOffers.getSettings.useQuery();
	const candidatesQuery = api.admin.homeOffers.listCandidates.useQuery();
	const comboCandidatesQuery =
		api.admin.homeOffers.listComboCandidates.useQuery();
	const featuredQuery = api.admin.homeOffers.listFeatured.useQuery();
	const previewQuery = api.admin.homeOffers.preview.useQuery();

	const [criterion, setCriterion] =
		useState<HomeOffersCriterion>("marketSaving");
	const [offersLimit, setOffersLimit] = useState("4");
	const [fillWithRanking, setFillWithRanking] = useState(true);
	const [previewVersion, setPreviewVersion] = useState(0);

	// The fill, the criterion and the number of places are saved with one
	// button, so they live in local state until the settings row answers again.
	useEffect(() => {
		if (!settingsQuery.data) return;
		setCriterion(settingsQuery.data.criterion);
		setOffersLimit(String(settingsQuery.data.offersLimit));
		setFillWithRanking(settingsQuery.data.fillWithRanking);
	}, [settingsQuery.data]);

	const invalidateHomeOffers = async () => {
		await utils.admin.homeOffers.invalidate();
		setPreviewVersion((version) => version + 1);
	};

	const onMutationError = (fallback: string) => (error: { message: string }) =>
		toast.error(error.message || fallback);

	const updateSettingsMutation =
		api.admin.homeOffers.updateSettings.useMutation({
			onSuccess: async () => {
				toast.success("Configuración de destacados guardada");
				await invalidateHomeOffers();
			},
			onError: onMutationError("No se pudo guardar la configuración"),
		});

	const setSpotlightMutation = api.admin.homeOffers.setSpotlight.useMutation({
		onSuccess: async () => {
			toast.success("Banda destacada actualizada");
			await invalidateHomeOffers();
		},
		onError: onMutationError("No se pudo cambiar la banda destacada"),
	});

	const addFeaturedMutation = api.admin.homeOffers.addFeatured.useMutation({
		onSuccess: async () => {
			toast.success("Agregado a destacados");
			await invalidateHomeOffers();
		},
		onError: onMutationError("No se pudo agregar a destacados"),
	});

	const removeFeaturedMutation =
		api.admin.homeOffers.removeFeatured.useMutation({
			onSuccess: async () => {
				toast.success("Quitado de destacados");
				await invalidateHomeOffers();
			},
			onError: onMutationError("No se pudo quitar de destacados"),
		});

	const reorderFeaturedMutation =
		api.admin.homeOffers.reorderFeatured.useMutation({
			onSuccess: async () => {
				await invalidateHomeOffers();
			},
			onError: async (error) => {
				toast.error(error.message || "No se pudo cambiar el orden");
				await invalidateHomeOffers();
			},
		});

	const featured = useMemo(
		() => featuredQuery.data ?? [],
		[featuredQuery.data],
	);
	const candidates = useMemo(
		() => candidatesQuery.data ?? [],
		[candidatesQuery.data],
	);
	const comboCandidates = useMemo(
		() => comboCandidatesQuery.data ?? [],
		[comboCandidatesQuery.data],
	);

	// Measured against the saved settings, which are what the preview reflects;
	// the unsaved input would make "No entra" contradict the preview.
	const placeCount = settingsQuery.data?.offersLimit ?? 4;
	const spotlightValue = targetValue(settingsQuery.data?.spotlight ?? null);
	const overflowingIds = findOverflowingFeatured(featured, placeCount);

	const savedSettings = settingsQuery.data;
	const isSettingsDirty = savedSettings
		? criterion !== savedSettings.criterion ||
			Number(offersLimit) !== savedSettings.offersLimit ||
			fillWithRanking !== savedSettings.fillWithRanking
		: false;
	const saveSettings = () =>
		updateSettingsMutation.mutate({
			criterion,
			offersLimit: Number(offersLimit),
			fillWithRanking,
		});

	const productOptions = useMemo<ComboboxOption[]>(
		() =>
			candidates.map((candidate) => ({
				value: targetValue({ kind: "product", productId: candidate.productId }),
				label: candidate.name,
				keywords: candidate.brandName ? [candidate.brandName] : undefined,
				group: "Productos",
			})),
		[candidates],
	);
	const comboOptions = useMemo<ComboboxOption[]>(
		() =>
			comboCandidates
				.filter((combo) => combo.active)
				.map((combo) => ({
					value: targetValue({ kind: "combo", comboId: combo.comboId }),
					label: comboLabel(combo),
					keywords: combo.groupName ? [combo.groupName] : undefined,
					group: "Combos",
				})),
		[comboCandidates],
	);

	const spotlightOptions = useMemo<ComboboxOption[]>(
		() => [
			{ value: SPOTLIGHT_NONE, label: "Sin elección" },
			...comboOptions,
			...productOptions,
		],
		[comboOptions, productOptions],
	);

	const missingSpotlightOption =
		spotlightValue !== SPOTLIGHT_NONE &&
		!spotlightOptions.some((option) => option.value === spotlightValue);

	const listedValues = new Set(
		featured.map((item) => targetValue(item.target)),
	);
	const addOptions = [...comboOptions, ...productOptions].filter(
		(option) => !listedValues.has(option.value),
	);

	const isEditingList =
		addFeaturedMutation.isPending ||
		removeFeaturedMutation.isPending ||
		reorderFeaturedMutation.isPending;

	const moveFeatured = (index: number, offset: number) => {
		const target = index + offset;
		if (target < 0 || target >= featured.length) return;
		const ids = featured.map((item) => item.id);
		const [moved] = ids.splice(index, 1);
		if (moved === undefined) return;
		ids.splice(target, 0, moved);
		reorderFeaturedMutation.mutate({ ids });
	};

	const queries = [
		settingsQuery,
		candidatesQuery,
		comboCandidatesQuery,
		featuredQuery,
	];
	if (queries.some((query) => query.isLoading)) {
		return (
			<CrudPageShell description={PAGE_DESCRIPTION} title={PAGE_TITLE}>
				<CrudLoadingState />
			</CrudPageShell>
		);
	}

	const failed = queries.find((query) => query.isError);
	if (failed) {
		return (
			<CrudPageShell description={PAGE_DESCRIPTION} title={PAGE_TITLE}>
				<CrudErrorState
					message={failed.error?.message ?? "Error desconocido"}
				/>
			</CrudPageShell>
		);
	}

	return (
		<CrudPageShell description={PAGE_DESCRIPTION} title={PAGE_TITLE}>
			<div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
				<Card>
					<CardHeader>
						<CardTitle>Lista de destacados</CardTitle>
						<CardDescription>
							Los combos y productos de la sección, en este orden. Un combo
							muestra a todo su grupo en una sola tarjeta.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						{overflowingIds.size > 0 ? (
							<Alert>
								<TriangleAlertIcon />
								<AlertTitle>
									Hay más destacados que lugares en la sección
								</AlertTitle>
								<AlertDescription>
									La sección muestra{" "}
									{placeCount === 1 ? "1 lugar" : `${placeCount} lugares`}.{" "}
									{overflowingIds.size === 1
										? "La última entrada de la lista no se va a ver"
										: `Las últimas ${overflowingIds.size} entradas de la lista no se van a ver`}{" "}
									hasta que sumes lugares o quites otras.
								</AlertDescription>
							</Alert>
						) : null}

						{featured.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								La lista está vacía.{" "}
								{settingsQuery.data?.fillWithRanking
									? "La sección se arma sola con el ranking."
									: "Con el relleno apagado, la sección queda vacía."}
							</p>
						) : (
							<ol className="flex flex-col gap-2">
								{featured.map((item, index) => {
									const chip = featuredStatusChipConfig(
										item,
										overflowingIds.has(item.id),
										placeCount,
									);
									return (
										<li
											className="flex items-center gap-3 rounded-2xl border p-3"
											key={item.id}
										>
											<span className="font-mono text-muted-foreground text-xs">
												#{index + 1}
											</span>
											<Badge variant="outline">
												{item.target.kind === "combo" ? "Combo" : "Producto"}
											</Badge>
											<span className="min-w-0 flex-1 truncate font-medium text-foreground text-sm">
												{item.name}
											</span>
											{chip ? <StatusChip config={chip} /> : null}
											<div className="flex shrink-0 items-center">
												<RowIconButton
													disabled={index === 0 || isEditingList}
													label={`Subir ${item.name}`}
													onClick={() => moveFeatured(index, -1)}
												>
													<ArrowUpIcon />
												</RowIconButton>
												<RowIconButton
													disabled={
														index === featured.length - 1 || isEditingList
													}
													label={`Bajar ${item.name}`}
													onClick={() => moveFeatured(index, 1)}
												>
													<ArrowDownIcon />
												</RowIconButton>
												<RowIconButton
													disabled={isEditingList}
													label={`Quitar ${item.name}`}
													onClick={() =>
														removeFeaturedMutation.mutate({ id: item.id })
													}
												>
													<XIcon />
												</RowIconButton>
											</div>
										</li>
									);
								})}
							</ol>
						)}

						<Field>
							<FieldLabel htmlFor="home-offers-add">
								Agregar combo o producto
							</FieldLabel>
							<Combobox
								disabled={isEditingList || addOptions.length === 0}
								emptyText="Sin combos ni productos para agregar"
								id="home-offers-add"
								onChange={(value) => {
									const target = parseTargetValue(value);
									if (target) addFeaturedMutation.mutate({ target });
								}}
								options={addOptions}
								placeholder="Agregar combo o producto…"
								searchPlaceholder="Buscar..."
								value={null}
							/>
							<FieldDescription>
								Se agrega al final. Solo aparecen combos activos y productos con
								precio vigente.
							</FieldDescription>
						</Field>
					</CardContent>
				</Card>
				<div className="flex flex-col gap-5">
					<Card>
						<CardHeader>
							<CardTitle>Banda destacada</CardTitle>
							<CardDescription>
								Un producto o un combo en su propia banda, arriba de los
								destacados. No se repite en la sección.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Field>
								<FieldLabel htmlFor="home-offers-spotlight">
									Qué va en la banda
								</FieldLabel>
								<Combobox
									disabled={setSpotlightMutation.isPending}
									emptyText="Sin productos ni combos para mostrar"
									id="home-offers-spotlight"
									onChange={(value) =>
										setSpotlightMutation.mutate({
											target: parseTargetValue(value),
										})
									}
									options={spotlightOptions}
									placeholder="Sin elección"
									searchPlaceholder="Buscar producto o combo..."
									value={targetValue(settingsQuery.data?.spotlight ?? null)}
								/>
								<FieldDescription>
									Sin elección, va el primero del ranking (si el relleno está
									prendido).
								</FieldDescription>
								{missingSpotlightOption ? (
									<Alert>
										<TriangleAlertIcon />
										<AlertDescription>
											La elección guardada está inactiva o no tiene precio
											vigente. No se muestra. Elegí otra opción o quitá la
											elección.
										</AlertDescription>
									</Alert>
								) : null}
							</Field>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>Relleno</CardTitle>
							<CardDescription>
								El ranking completa con productos los lugares que la lista deja
								libres.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-5">
							<Field orientation="horizontal">
								<Checkbox
									checked={fillWithRanking}
									id="home-offers-fill"
									onCheckedChange={(checked) =>
										setFillWithRanking(checked === true)
									}
								/>
								<FieldContent>
									<FieldLabel htmlFor="home-offers-fill">
										Completar con productos del ranking
									</FieldLabel>
									<FieldDescription>
										Apagado, la sección muestra solo la lista y la banda solo lo
										que elijas.
									</FieldDescription>
								</FieldContent>
							</Field>

							<Field>
								<FieldLabel>Criterio del ranking</FieldLabel>
								<ToggleGroup
									className="flex-wrap"
									disabled={!fillWithRanking}
									onValueChange={(value) => {
										if (value) setCriterion(value as HomeOffersCriterion);
									}}
									type="single"
									value={criterion}
									variant="outline"
								>
									{criterionOptions.map((option) => (
										<ToggleGroupItem key={option.value} value={option.value}>
											{option.label}
										</ToggleGroupItem>
									))}
								</ToggleGroup>
								<FieldDescription>
									{
										criterionOptions.find(
											(option) => option.value === criterion,
										)?.description
									}
								</FieldDescription>
							</Field>

							<Field className="md:w-48">
								<FieldLabel htmlFor="home-offers-limit">
									Lugares en la sección
								</FieldLabel>
								<Input
									id="home-offers-limit"
									inputMode="numeric"
									max={12}
									min={1}
									onChange={(event) => setOffersLimit(event.target.value)}
									type="number"
									value={offersLimit}
								/>
								<FieldDescription>
									Entre 1 y 12. Un combo ocupa un lugar.
								</FieldDescription>
							</Field>

							<div>
								<Button
									disabled={
										!isSettingsDirty || updateSettingsMutation.isPending
									}
									onClick={saveSettings}
									variant="highlight"
								>
									<SaveIcon data-icon="inline-start" />
									Guardar configuración
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Vista previa</CardTitle>
					<CardDescription>Lo que el home muestra ahora.</CardDescription>
					{previewQuery.data ? (
						<p className="text-muted-foreground text-sm">
							{previewSummary(previewQuery.data)}
						</p>
					) : previewQuery.isError ? (
						<p className="text-destructive text-sm">
							No se pudo calcular el resumen de la vista previa.
						</p>
					) : null}
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{isSettingsDirty ? (
						<Alert>
							<TriangleAlertIcon />
							<AlertTitle>Hay cambios sin guardar en Relleno</AlertTitle>
							<AlertDescription className="flex flex-col items-start gap-3">
								La vista previa muestra lo que el home muestra ahora.
								<Button
									disabled={updateSettingsMutation.isPending}
									onClick={saveSettings}
									size="sm"
									variant="highlight"
								>
									<SaveIcon data-icon="inline-start" />
									Guardar cambios
								</Button>
							</AlertDescription>
						</Alert>
					) : null}
					<HomePreviewFrame version={previewVersion} />
				</CardContent>
			</Card>
		</CrudPageShell>
	);
}
