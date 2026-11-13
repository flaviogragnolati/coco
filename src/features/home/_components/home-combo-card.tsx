"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { cn } from "~/lib/utils";
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

export function HomeComboCard({
	card,
	isAuthenticated,
	userId,
	size = "default",
}: {
	card: HomeComboCardData;
	isAuthenticated: boolean;
	userId: string | null;
	size?: "default" | "hero";
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

	return (
		<Card
			className={cn("h-full gap-0 overflow-hidden py-0", hero && "shadow-xl")}
			size={hero ? "default" : "sm"}
		>
			<HomeComboMosaic
				comboName={option.name}
				images={selectComboMosaicImages(option.items)}
			/>
			<CardHeader className={hero ? "gap-1 pt-5" : "gap-0.5 pt-4"}>
				<div>
					<Badge variant="secondary">Combo</Badge>
				</div>
				<CardTitle>
					<Heading
						className={cn(
							"font-heading",
							hero ? "text-2xl" : "line-clamp-2 text-base",
						)}
					>
						{option.name}
					</Heading>
				</CardTitle>
				{showDescription ? (
					<p className="line-clamp-3 text-muted-foreground text-sm">
						{description}
					</p>
				) : null}
			</CardHeader>
			<CardContent
				className={cn(
					"flex flex-1 flex-col gap-3",
					hero ? "pt-4 pb-5" : "pt-3 pb-4",
				)}
			>
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
			</CardContent>
		</Card>
	);
}
