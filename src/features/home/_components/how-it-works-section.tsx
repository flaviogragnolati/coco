import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { howItWorksSteps } from "../home-content";
import { SectionHeading } from "./section-heading";

export function HowItWorksSection() {
	return (
		<section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-12 md:px-6">
			<SectionHeading
				description="Coco transforma pedidos individuales en una compra consolidada sin agregar coordinacion manual entre usuarios."
				eyebrow="Como funciona"
				title="Un proceso pensado para comprar mejor con menos friccion."
			/>
			<div className="grid gap-3 md:grid-cols-4">
				{howItWorksSteps.map(({ title, description, Icon }, index) => (
					<Card key={title}>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Icon />
								{index + 1}. {title}
							</CardTitle>
							<CardDescription>{description}</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground text-xs/relaxed">
								Cada paso mantiene la operacion clara y preparada para avanzar
								cuando se alcanza la condicion mayorista.
							</p>
						</CardContent>
					</Card>
				))}
			</div>
		</section>
	);
}
