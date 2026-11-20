import { Badge } from "~/components/ui/badge";
import type { HomeFeature } from "~/shared/common/home.types";
import { HomeFeatureCard } from "./home-feature-card";

const bandTextByKind: Record<HomeFeature["kind"], string> = {
	product:
		"Sumalo a tu pedido desde acá o seguí mirando los destacados de abajo.",
	combo:
		"Sumá todos sus productos de una vez. Después cambiás lo que quieras en tu pedido.",
};

export function HomeSpotlightBand({
	feature,
	isAuthenticated,
	userId,
}: {
	feature: HomeFeature;
	isAuthenticated: boolean;
	userId: string | null;
}) {
	return (
		<section
			aria-label="Destacado"
			className="bg-brand-soft px-4 py-12 text-brand-soft-foreground [--muted-foreground:color-mix(in_oklch,var(--brand-soft-foreground)_70%,transparent)] md:px-6 md:py-16"
		>
			<div className="mx-auto w-full max-w-5xl">
				<HomeFeatureCard
					feature={feature}
					intro={
						<div className="flex flex-col items-start gap-3">
							<Badge variant="highlight">Destacado</Badge>
							<p className="text-base/relaxed sm:text-lg/relaxed">
								{bandTextByKind[feature.kind]}
							</p>
						</div>
					}
					isAuthenticated={isAuthenticated}
					size="hero"
					userId={userId}
				/>
			</div>
		</section>
	);
}
