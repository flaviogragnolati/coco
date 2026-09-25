"use client";

import { SearchIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

export function NavbarSearch({ className }: { className?: string }) {
	const pathname = usePathname();
	const router = useRouter();
	if (pathname.startsWith("/products")) return null;
	return (
		<search className={cn("relative", className)}>
			<form
				action="/products"
				method="get"
				onSubmit={(event) => {
					const query = new FormData(event.currentTarget).get("q");
					if (typeof query === "string" && !query.trim()) {
						event.preventDefault();
						router.push("/products");
					}
				}}
			>
				<SearchIcon
					aria-hidden="true"
					className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-brand-warm-foreground"
				/>
				<Input
					aria-label="Buscar productos"
					className="h-10 rounded-full border-0 bg-brand-warm pl-10 text-brand-warm-foreground"
					name="q"
					placeholder="¿Con qué producto querés ahorrar?"
					type="search"
				/>
			</form>
		</search>
	);
}
