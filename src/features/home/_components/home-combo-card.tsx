"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { formatCurrency } from "~/shared/common/commerce.helpers";
import type { HomeComboCard as HomeComboCardData } from "~/shared/common/home.types";
import {
	formatComboForPeople,
	formatComboItemQuantity,
	formatPeopleLabel,
	selectComboMosaicImages,
} from "../home-formatters";
import { HomeComboAddButton } from "./home-combo-add-button";
import { HomeComboMosaic } from "./home-combo-mosaic";

/**
 * A combo card: a card in the grid; `hero` in the spotlight band, mosaic beside
 * the purchase and no card around them, with `intro` over the title.
 */
export function HomeComboCard({
	card,
	isAuthenticated,
	userId,
	size = "default",
	intro,
}: {
	card: HomeComboCardData;
	isAuthenticated: boolean;
	userId: string | null;
	size?: "default" | "hero";
	intro?: ReactNode;
}) {
	const [selectedId, setSelectedId] = useState(card.initialComboId);
	const option =
		card.options.find((candidate) => candidate.comboId === selectedId) ??
		card.options[0];
	if (!option) return null;

	const hero = size === "hero";
	const Heading = hero ? "h2" : "h3";
	const description = option.description?.trim();
	const showDescription =
		description && description.toLowerCase() !== option.name.toLowerCase();

	const mosaic = (
		<HomeComboMosaic
			comboName={option.name}
			images={selectComboMosaicImages(option.items)}
		/>
	);
	const purchase = (
		<>
			{card.options.length > 1 ? (
				<ToggleGroup
					aria-label="Cantidad de personas"
					className="flex-wrap"
					onValueChange={(value) => {
						if (value) setSelectedId(Number(value));
					}}
					type="single"
					value={String(option.comboId)}
					variant="outline"
				>
					{card.options.map((candidate) => (
						<ToggleGroupItem
							key={candidate.comboId}
							value={String(candidate.comboId)}
						>
							{candidate.people === null
								? candidate.name
								: formatPeopleLabel(candidate.people)}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			) : option.people !== null ? (
				<p className="font-medium text-sm">
					{formatComboForPeople(option.people)}
				</p>
			) : null}

			<ul className="flex flex-col gap-1.5 text-sm">
				{option.items.map((item) => (
					<li
						className="flex items-baseline justify-between gap-3"
						key={item.offer.productId}
					>
						<Link
							className="min-w-0 hover:underline"
							href={`/products?product=${item.offer.productId}`}
						>
							{item.offer.productName}
						</Link>
						<span className="shrink-0 text-muted-foreground tabular-nums">
							{formatComboItemQuantity(item)} ·{" "}
							{formatCurrency(item.lineTotal, item.offer.currency)}
						</span>
					</li>
				))}
			</ul>

			{option.unavailableNames.length > 0 ? (
				<p className="text-muted-foreground text-sm">
					Esta semana no está: {option.unavailableNames.join(", ")}.
				</p>
			) : null}

			<div className="mt-auto flex flex-col gap-3 pt-1">
				<p className="flex items-baseline justify-between gap-3 border-t pt-3">
					<span className="font-medium">Total hoy</span>
					<span className="font-heading font-semibold text-lg tabular-nums">
						{formatCurrency(option.total, option.currency)}
					</span>
				</p>
				<HomeComboAddButton
					isAuthenticated={isAuthenticated}
					option={option}
					size={hero ? "default" : "compact"}
					userId={userId}
				/>
			</div>
		</>
	);

	if (hero) {
		return (
			<article className="grid gap-6 md:grid-cols-2 md:items-center md:gap-10">
				<div className="overflow-hidden rounded-3xl">{mosaic}</div>
				<div className="flex flex-col gap-3">
					{intro}
					<div>
						<Badge variant="secondary">Combo</Badge>
					</div>
					<Heading className="font-bold font-heading text-[clamp(26px,3vw,34px)] leading-tight tracking-tight">
						{option.name}
					</Heading>
					{showDescription ? (
						<p className="line-clamp-3 text-brand-soft-foreground/70 text-sm">
							{description}
						</p>
					) : null}
					{purchase}
				</div>
			</article>
		);
	}

	return (
		<Card className="h-full gap-0 overflow-hidden py-0" size="sm">
			{mosaic}
			<CardHeader className="gap-0.5 pt-4">
				<div>
					<Badge variant="secondary">Combo</Badge>
				</div>
				<CardTitle>
					<Heading className="line-clamp-2 font-heading text-base">
						{option.name}
					</Heading>
				</CardTitle>
				{showDescription ? (
					<p className="line-clamp-3 text-muted-foreground text-sm">
						{description}
					</p>
				) : null}
			</CardHeader>
			<CardContent className="flex flex-1 flex-col gap-3 pt-3 pb-4">
				{purchase}
			</CardContent>
		</Card>
	);
}
