import { BoxesIcon, ShieldCheckIcon, TruckIcon } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "~/components/page-header";
import { SupplierApplicationForm } from "./_components/supplier-application-form";

export const metadata: Metadata = {
	title: "Sé proveedor | Coco",
	description:
		"Vendé por volumen a la comunidad de Ushuaia. Dejanos tus datos y te contactamos.",
};

const supplierBenefits = [
	{
		title: "Pedidos por volumen",
		description:
			"Juntamos lo que piden muchos vecinos y te hacemos una compra por volumen.",
		Icon: BoxesIcon,
	},
	{
		title: "Demanda real",
		description: "Solo compramos lo que los vecinos ya pidieron y pagaron.",
		Icon: ShieldCheckIcon,
	},
	{
		title: "Entrega en la ciudad",
		description:
			"Recibimos la mercadería en la ciudad y nos ocupamos de repartirla entre los vecinos.",
		Icon: TruckIcon,
	},
];

export default function SupplierApplicationPage() {
	return (
		<main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 md:py-12">
			<PageHeader
				description="Coco reúne los pedidos de la comunidad de Ushuaia para comprar por volumen. Si vendés por mayor, contanos qué ofrecés y te contactamos."
				eyebrow="Proveedores"
				title="Sé proveedor de Coco"
			/>

			<ul className="grid gap-4 md:grid-cols-3">
				{supplierBenefits.map(({ title, description, Icon }) => (
					<li
						className="flex flex-col gap-3 rounded-3xl bg-brand-warm p-5 text-brand-warm-foreground"
						key={title}
					>
						<span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground">
							<Icon aria-hidden="true" className="size-5" />
						</span>
						<div className="flex flex-col gap-1">
							<h2 className="font-heading font-semibold">{title}</h2>
							<p className="text-sm/relaxed">{description}</p>
						</div>
					</li>
				))}
			</ul>

			<SupplierApplicationForm />
		</main>
	);
}
