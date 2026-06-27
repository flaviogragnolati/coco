"use client";

import { RouteIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";

const MAX_RESULTS = 8;

export function CartTraceabilitySearchCard() {
	const [term, setTerm] = useState("");
	const [submitted, setSubmitted] = useState("");

	const resultsQuery = api.admin.operationsCart.list.useQuery(
		{ search: submitted, includeDeleted: true },
		{ enabled: submitted.length > 0 },
	);

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault();
		setSubmitted(term.trim());
	};

	const results = resultsQuery.data ?? [];

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<RouteIcon />
					Trazabilidad de carrito
				</CardTitle>
				<CardDescription>
					Busca un carrito por codigo, usuario o producto y abri su lineage de
					fulfillment completo.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<form className="flex gap-2" onSubmit={handleSubmit}>
					<div className="relative flex-1">
						<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							aria-label="Buscar carrito para rastrear"
							className="pl-8"
							onChange={(event) => setTerm(event.target.value)}
							placeholder="Codigo de carrito, usuario o producto"
							value={term}
						/>
					</div>
					<Button type="submit">Buscar</Button>
				</form>

				{submitted.length > 0 ? (
					resultsQuery.isLoading ? (
						<p className="text-muted-foreground text-xs">Buscando...</p>
					) : results.length > 0 ? (
						<ul className="flex flex-col gap-1">
							{results.slice(0, MAX_RESULTS).map((cart) => (
								<li key={cart.id}>
									<Button
										asChild
										className="h-auto w-full justify-start py-2"
										variant="outline"
									>
										<Link href={`/admin/operations/user-carts/${cart.id}`}>
											<span className="font-mono">{cart.code}</span>
											<span className="text-muted-foreground text-xs">
												{cart.user.name}
												{cart.deleted ? " · eliminado" : ""}
											</span>
										</Link>
									</Button>
								</li>
							))}
						</ul>
					) : (
						<p className="text-muted-foreground text-xs">
							No se encontraron carritos para "{submitted}".
						</p>
					)
				) : null}
			</CardContent>
		</Card>
	);
}
