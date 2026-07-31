"use client";

import {
	ArrowDownIcon,
	ArrowUpIcon,
	PinOffIcon,
	PlusIcon,
	SaveIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Combobox, type ComboboxOption } from "~/components/ui/combobox";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { CrudPageShell } from "~/features/admin/crud/_components/crud-page-shell";
import {
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { compareRankedOffers } from "~/server/services/home/home-ranking";
import type {
	HomeOfferCandidate,
	HomeOffersCriterion,
} from "~/shared/common/admin-crud/home-offers.types";
import {
	formatCurrency,
	productUnitLabelMap,
	toNumber,
} from "~/shared/common/commerce.helpers";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import { api } from "~/trpc/react";

const spotlightNoneValue = "none";

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
];

function describeCandidate(candidate: HomeOfferCandidate) {
	const parts: string[] = [];
	if (candidate.brandName) parts.push(candidate.brandName);
	parts.push(productUnitLabelMap[candidate.unit]);
	return parts.join(" · ");
}

function describeOfferValue(candidate: HomeOfferCandidate) {
	const parts: string[] = [];

	if (candidate.offerUnitPrice !== null) {
		parts.push(
			`${formatCurrency(candidate.offerUnitPrice, candidate.currency ?? "ARS")} por ${productUnitLabelMap[candidate.unit]}`,
		);
	}
	if (candidate.discountPercent) parts.push(`-${candidate.discountPercent}%`);
	if (candidate.marketSaving !== null) {
		parts.push(
			`ahorra ${formatCurrency(candidate.marketSaving, candidate.currency ?? "ARS")}`,
		);
	}

	return parts.join(" · ");
}

export function HomeOffersClient() {
	const utils = api.useUtils();

	const settingsQuery = api.admin.homeOffers.getSettings.useQuery();
	const candidatesQuery = api.admin.homeOffers.listCandidates.useQuery();

	const [criterion, setCriterion] =
		useState<HomeOffersCriterion>("marketSaving");
	const [offersLimit, setOffersLimit] = useState("4");

	// The criterion and the grid size are edited together and saved with one
	// button, so they live in local state until the settings row answers again.
	useEffect(() => {
		if (!settingsQuery.data) return;
		setCriterion(settingsQuery.data.criterion);
		setOffersLimit(String(settingsQuery.data.offersLimit));
	}, [settingsQuery.data]);

	const invalidateHomeOffers = async () => {
		await Promise.all([
			utils.admin.homeOffers.getSettings.invalidate(),
			utils.admin.homeOffers.listCandidates.invalidate(),
		]);
	};

	const updateSettingsMutation =
		api.admin.homeOffers.updateSettings.useMutation({
			onSuccess: async () => {
				toast.success("Configuración de ofertas guardada");
				await invalidateHomeOffers();
			},
			onError: (error) => {
				toast.error(error.message || "No se pudo guardar la configuración");
			},
		});

	const setSpotlightMutation = api.admin.homeOffers.setSpotlight.useMutation({
		onSuccess: async () => {
			toast.success("Producto destacado actualizado");
			await invalidateHomeOffers();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo cambiar el producto destacado");
		},
	});

	const setPinnedRankMutation =
		api.admin.homeOffers.setPinnedRank.useMutation();

	const candidates = useMemo(
		() => candidatesQuery.data ?? [],
		[candidatesQuery.data],
	);
	const spotlightProductId = settingsQuery.data?.spotlightProductId ?? null;

	const parsedLimit = toNumber(offersLimit);
	const gridSize =
		parsedLimit !== null && parsedLimit >= 1
			? Math.floor(parsedLimit)
			: (settingsQuery.data?.offersLimit ?? 4);

	const pinned = useMemo(
		() =>
			candidates
				.filter((candidate) => candidate.pinnedRank !== null)
				.sort(
					(left, right) =>
						(left.pinnedRank ?? 0) - (right.pinnedRank ?? 0) ||
						left.name.localeCompare(right.name),
				),
		[candidates],
	);

	// Ordered by the home's own comparator, not a lookalike: a preview that
	// disagreed with the grid it predicts would be worse than no preview.
	const rankingFill = useMemo(
		() =>
			candidates
				.filter(
					(candidate) =>
						candidate.hasCurrentTerms &&
						candidate.pinnedRank === null &&
						candidate.productId !== spotlightProductId,
				)
				.map((candidate) => ({
					...candidate,
					fromDate: candidate.termsFromDate ?? new Date(0),
					productClientTermsId: candidate.productClientTermsId ?? 0,
				}))
				.sort(
					compareRankedOffers((candidate) =>
						criterion === "marketSaving"
							? candidate.marketSaving
							: toNumber(candidate.discountPercent),
					),
				),
		[candidates, criterion, spotlightProductId],
	);

	const renderedPinned = pinned.filter(
		(candidate) =>
			candidate.hasCurrentTerms && candidate.productId !== spotlightProductId,
	);
	const shownPinned = renderedPinned.slice(0, gridSize);
	const hiddenPinnedCount = renderedPinned.length - shownPinned.length;
	const previewFill = rankingFill.slice(
		0,
		Math.max(0, gridSize - shownPinned.length),
	);

	const spotlightOptions = useMemo<ComboboxOption[]>(
		() => [
			{ value: spotlightNoneValue, label: "Sin destacado (usa el ranking)" },
			...candidates
				.filter((candidate) => candidate.hasCurrentTerms)
				.map((candidate) => ({
					value: String(candidate.productId),
					label: candidate.name,
					keywords: candidate.brandName ? [candidate.brandName] : undefined,
				})),
		],
		[candidates],
	);

	const pinnableOptions = useMemo<ComboboxOption[]>(
		() =>
			candidates
				.filter(
					(candidate) =>
						candidate.hasCurrentTerms && candidate.pinnedRank === null,
				)
				.map((candidate) => ({
					value: String(candidate.productId),
					label: candidate.name,
					keywords: candidate.brandName ? [candidate.brandName] : undefined,
				})),
		[candidates],
	);

	const isReordering = setPinnedRankMutation.isPending;

	const runPinUpdates = async (
		updates: Array<{ productId: number; rank: number | null }>,
		successMessage: string,
	) => {
		try {
			for (const update of updates) {
				await setPinnedRankMutation.mutateAsync(update);
			}
			toast.success(successMessage);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "No se pudieron actualizar las ofertas fijadas",
			);
		} finally {
			await invalidateHomeOffers();
		}
	};

	// Ranks are renormalized to 1..n on every reorder: gaps and ties would make
	// the pinned order depend on a tie-break the admin never chose.
	const applyPinnedOrder = async (
		ordered: HomeOfferCandidate[],
		successMessage: string,
	) => {
		const updates = ordered
			.map((candidate, index) => ({
				productId: candidate.productId,
				rank: index + 1,
				currentRank: candidate.pinnedRank,
			}))
			.filter((update) => update.currentRank !== update.rank)
			.map(({ productId, rank }) => ({ productId, rank }));

		if (updates.length === 0) return;
		await runPinUpdates(updates, successMessage);
	};

	const movePinned = async (index: number, offset: number) => {
		const target = index + offset;
		if (target < 0 || target >= pinned.length) return;

		const ordered = [...pinned];
		const [moved] = ordered.splice(index, 1);
		if (!moved) return;
		ordered.splice(target, 0, moved);

		await applyPinnedOrder(ordered, "Orden de ofertas fijadas actualizado");
	};

	const addPinned = async (productId: number) => {
		// One past the highest rank in use, not `pinned.length + 1`: the ranks in
		// the database may have gaps and a collision would make the new pin land
		// on an arbitrary tie-break.
		const lastRank = pinned.reduce(
			(highest, candidate) => Math.max(highest, candidate.pinnedRank ?? 0),
			0,
		);
		await runPinUpdates([{ productId, rank: lastRank + 1 }], "Oferta fijada");
	};

	const removePinned = async (candidate: HomeOfferCandidate) => {
		await runPinUpdates(
			[{ productId: candidate.productId, rank: null }],
			`${candidate.name} ya no está fijado`,
		);
	};

	if (settingsQuery.isLoading || candidatesQuery.isLoading) {
		return (
			<CrudPageShell
				description="Elegí qué productos ocupan la grilla de ofertas del home y cuál es el producto destacado."
				title="Ofertas del home"
			>
				<CrudLoadingState />
			</CrudPageShell>
		);
	}

	if (settingsQuery.isError || candidatesQuery.isError) {
		return (
			<CrudPageShell
				description="Elegí qué productos ocupan la grilla de ofertas del home y cuál es el producto destacado."
				title="Ofertas del home"
			>
				<CrudErrorState
					message={
						settingsQuery.error?.message ??
						candidatesQuery.error?.message ??
						"Error desconocido"
					}
				/>
			</CrudPageShell>
		);
	}

	return (
		<CrudPageShell
			description="Elegí qué productos ocupan la grilla de ofertas del home y cuál es el producto destacado."
			title="Ofertas del home"
		>
			<Card>
				<CardHeader>
					<CardTitle>Configuración</CardTitle>
					<CardDescription>
						El producto destacado va al hero y no se repite en la grilla. El
						criterio ordena todo lo que no esté fijado.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-5">
					<Field>
						<FieldLabel htmlFor="home-offers-spotlight">
							Producto destacado
						</FieldLabel>
						<Combobox
							disabled={setSpotlightMutation.isPending}
							emptyText="Sin productos con términos vigentes"
							id="home-offers-spotlight"
							onChange={(value) =>
								setSpotlightMutation.mutate({
									productId:
										value === spotlightNoneValue ? null : Number(value),
								})
							}
							options={spotlightOptions}
							placeholder="Sin destacado (usa el ranking)"
							searchPlaceholder="Buscar producto..."
							value={
								spotlightProductId === null
									? spotlightNoneValue
									: String(spotlightProductId)
							}
						/>
						<FieldDescription>
							Solo se ofrecen productos con términos de cliente vigentes: sin
							ellos el hero no tendría precio que mostrar.
						</FieldDescription>
					</Field>

					<Field>
						<FieldLabel>Criterio del ranking</FieldLabel>
						<ToggleGroup
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
								criterionOptions.find((option) => option.value === criterion)
									?.description
							}
						</FieldDescription>
					</Field>

					<Field className="md:w-48">
						<FieldLabel htmlFor="home-offers-limit">
							Ofertas en la grilla
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
						<FieldDescription>Entre 1 y 12 tarjetas.</FieldDescription>
					</Field>

					<div>
						<Button
							disabled={updateSettingsMutation.isPending}
							onClick={() =>
								updateSettingsMutation.mutate({
									criterion,
									offersLimit: Number(offersLimit),
								})
							}
							variant="highlight"
						>
							<SaveIcon data-icon="inline-start" />
							Guardar configuración
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Ofertas fijadas</CardTitle>
					<CardDescription>
						Las fijadas ocupan la grilla en este orden; el ranking completa los
						lugares que sobran.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{hiddenPinnedCount > 0 ? (
						<Alert>
							<TriangleAlertIcon />
							<AlertTitle>Hay más fijadas que lugares en la grilla</AlertTitle>
							<AlertDescription>
								Fijaste {renderedPinned.length} ofertas y la grilla muestra{" "}
								{gridSize}. Las últimas {hiddenPinnedCount} no se van a ver
								hasta que subas el tamaño de la grilla o las desfijes.
							</AlertDescription>
						</Alert>
					) : null}

					{pinned.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No hay ofertas fijadas. La grilla se arma sola con el ranking.
						</p>
					) : (
						<ul className="flex flex-col gap-2">
							{pinned.map((candidate, index) => {
								const isSpotlight = candidate.productId === spotlightProductId;
								const isOverLimit =
									candidate.hasCurrentTerms &&
									!isSpotlight &&
									renderedPinned.indexOf(candidate) >= gridSize;

								return (
									<li
										className="flex flex-wrap items-center gap-3 rounded-2xl border p-3"
										key={candidate.productId}
									>
										<span className="font-mono text-muted-foreground text-xs">
											#{index + 1}
										</span>
										<div className="flex min-w-48 flex-1 flex-col gap-0.5">
											<span className="font-medium text-foreground text-sm">
												{candidate.name}
											</span>
											<span className="text-muted-foreground text-xs">
												{describeCandidate(candidate)}
												{describeOfferValue(candidate)
													? ` · ${describeOfferValue(candidate)}`
													: ""}
											</span>
											{candidate.termsToDate ? (
												<span className="text-muted-foreground text-xs">
													Términos vigentes hasta{" "}
													{formatDateTimeShort(candidate.termsToDate)}
												</span>
											) : null}
										</div>
										{candidate.hasCurrentTerms ? null : (
											<Badge variant="destructive">Sin términos vigentes</Badge>
										)}
										{isSpotlight ? (
											<Badge variant="info">
												Destacado, fuera de la grilla
											</Badge>
										) : null}
										{isOverLimit ? (
											<Badge variant="warning">Fuera de la grilla</Badge>
										) : null}
										<div className="flex items-center gap-1">
											<Button
												aria-label={`Subir ${candidate.name}`}
												disabled={index === 0 || isReordering}
												onClick={() => void movePinned(index, -1)}
												size="icon"
												variant="outline"
											>
												<ArrowUpIcon />
											</Button>
											<Button
												aria-label={`Bajar ${candidate.name}`}
												disabled={index === pinned.length - 1 || isReordering}
												onClick={() => void movePinned(index, 1)}
												size="icon"
												variant="outline"
											>
												<ArrowDownIcon />
											</Button>
											<Button
												disabled={isReordering}
												onClick={() => void removePinned(candidate)}
												variant="outline"
											>
												<PinOffIcon data-icon="inline-start" />
												Desfijar
											</Button>
										</div>
									</li>
								);
							})}
						</ul>
					)}

					<Field className="md:w-96">
						<FieldLabel htmlFor="home-offers-add">Fijar un producto</FieldLabel>
						<Combobox
							disabled={isReordering || pinnableOptions.length === 0}
							emptyText="Sin productos con términos vigentes"
							id="home-offers-add"
							onChange={(value) => void addPinned(Number(value))}
							options={pinnableOptions}
							placeholder="Agregar a las fijadas"
							searchPlaceholder="Buscar producto..."
							value={null}
						/>
						<FieldDescription>
							Se agrega al final de la lista. Solo aparecen productos con
							términos de cliente vigentes.
						</FieldDescription>
					</Field>

					<div className="flex flex-col gap-2 rounded-2xl border border-dashed p-3">
						<div className="flex items-center gap-2">
							<PlusIcon className="size-3.5 text-muted-foreground" />
							<span className="font-medium text-sm">
								Completa el ranking ({previewFill.length}{" "}
								{previewFill.length === 1 ? "lugar" : "lugares"})
							</span>
						</div>
						{previewFill.length === 0 ? (
							<p className="text-muted-foreground text-xs">
								Las fijadas ya llenan la grilla.
							</p>
						) : (
							<ol className="flex flex-col gap-1">
								{previewFill.map((candidate, index) => (
									<li
										className="text-muted-foreground text-xs"
										key={candidate.productId}
									>
										{shownPinned.length + index + 1}. {candidate.name}
										{describeOfferValue(candidate)
											? ` — ${describeOfferValue(candidate)}`
											: ""}
									</li>
								))}
							</ol>
						)}
					</div>
				</CardContent>
			</Card>
		</CrudPageShell>
	);
}
