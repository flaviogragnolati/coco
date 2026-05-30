import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { contactItems } from "../home-content";
import { SectionHeading } from "./section-heading";

export function ContactSection() {
	return (
		<section
			className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-12 md:px-6"
			id="contacto"
		>
			<SectionHeading
				actions={
					<Button asChild variant="outline">
						<Link href="mailto:contacto@coco.app">
							Escribir
							<ArrowRightIcon data-icon="inline-end" />
						</Link>
					</Button>
				}
				description="Por ahora usamos canales directos para consultas comerciales, proveedores y compradores interesados."
				eyebrow="Contacto"
				title="Hablemos sobre compras consolidadas."
			/>
			<div className="grid gap-3 md:grid-cols-3">
				{contactItems.map(({ label, value, href, Icon }) => (
					<Card key={label}>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Icon />
								{label}
							</CardTitle>
							<CardDescription>
								{href ? (
									<Link
										className="underline-offset-4 hover:underline"
										href={href}
										rel={href.startsWith("http") ? "noreferrer" : undefined}
										target={href.startsWith("http") ? "_blank" : undefined}
									>
										{value}
									</Link>
								) : (
									value
								)}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground text-xs/relaxed">
								Dato temporal de contacto hasta conectar los canales
								definitivos.
							</p>
						</CardContent>
					</Card>
				))}
			</div>
		</section>
	);
}
