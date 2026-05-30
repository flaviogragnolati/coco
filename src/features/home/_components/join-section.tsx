import { ArrowRightIcon, CheckCircle2Icon, LogInIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { joinSteps } from "../home-content";
import { SectionHeading } from "./section-heading";

export function JoinSection({ isActiveUser }: { isActiveUser: boolean }) {
	const href = isActiveUser ? "/my-operations" : "/login";
	const label = isActiveUser ? "Ver mis operaciones" : "Continuar con Google";
	const Icon = isActiveUser ? ArrowRightIcon : LogInIcon;

	return (
		<section className="border-y bg-muted/30" id="unirse">
			<div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-12 md:grid-cols-[minmax(0,1fr)_360px] md:px-6">
				<SectionHeading
					description="El alta acompana el flujo actual de Coco: ingreso simple, perfil completo y acceso a operaciones."
					eyebrow="Unirse"
					title="Empeza a participar en compras consolidadas."
				/>
				<Card>
					<CardHeader>
						<CardTitle>Alta simple</CardTitle>
						<CardDescription>
							Usa tu cuenta de Google y queda listo el acceso inicial.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<div className="flex flex-col gap-3">
							{joinSteps.map((step) => (
								<div className="flex gap-2" key={step.title}>
									<CheckCircle2Icon className="mt-0.5 shrink-0 text-primary" />
									<div className="flex flex-col gap-1">
										<span className="font-medium text-sm">{step.title}</span>
										<p className="text-muted-foreground text-xs/relaxed">
											{step.description}
										</p>
									</div>
								</div>
							))}
						</div>
						<Button asChild>
							<Link href={href}>
								<Icon data-icon="inline-start" />
								{label}
							</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		</section>
	);
}
