import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";

export type CrudStatItem = {
	label: string;
	value: number | string;
	description?: string;
};

export function CrudStatsCards({ stats }: { stats: CrudStatItem[] }) {
	return (
		<section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			{stats.map((stat) => (
				<Card key={stat.label} size="sm">
					<CardHeader>
						<CardDescription>{stat.label}</CardDescription>
						<CardTitle className="text-xl">{stat.value}</CardTitle>
					</CardHeader>
					{stat.description ? (
						<CardContent>
							<p className="text-muted-foreground text-xs/relaxed">
								{stat.description}
							</p>
						</CardContent>
					) : null}
				</Card>
			))}
		</section>
	);
}
