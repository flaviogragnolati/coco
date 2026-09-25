import { trustItems } from "../home-content";

export function TrustStrip() {
	return (
		<section
			aria-label="Comprar con Coco"
			className="bg-brand-soft px-4 py-8 text-brand-soft-foreground md:px-6"
		>
			<div className="mx-auto grid max-w-7xl gap-7 md:grid-cols-3">
				{trustItems.map(({ title, description, Icon }) => (
					<div className="flex gap-4" key={title}>
						<span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card text-card-foreground">
							<Icon aria-hidden="true" className="size-5" />
						</span>
						<div>
							<h2 className="font-heading font-semibold text-lg">{title}</h2>
							<p className="mt-1 text-sm/relaxed">{description}</p>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
