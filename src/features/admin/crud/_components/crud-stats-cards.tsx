import type { LucideIcon } from "lucide-react";

import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";

export type CrudStatAccent =
	| "default"
	| "success"
	| "warning"
	| "info"
	| "destructive";

export type CrudStatItem = {
	label: string;
	value: number | string;
	description?: string;
	icon?: LucideIcon;
	accent?: CrudStatAccent;
	hint?: string;
};

const accentTextClass: Record<CrudStatAccent, string> = {
	default: "text-muted-foreground",
	success: "text-success",
	warning: "text-warning",
	info: "text-info",
	destructive: "text-destructive",
};

export function CrudStatsCards({ stats }: { stats: CrudStatItem[] }) {
	return (
		<section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			{stats.map((stat) => {
				const Icon = stat.icon;
				const accentClass = accentTextClass[stat.accent ?? "default"];

				return (
					<Card key={stat.label} size="sm">
						<CardHeader>
							{stat.hint ? (
								<Tooltip>
									<TooltipTrigger asChild>
										<CardDescription className="w-fit cursor-help underline decoration-dotted underline-offset-4">
											{stat.label}
										</CardDescription>
									</TooltipTrigger>
									<TooltipContent>{stat.hint}</TooltipContent>
								</Tooltip>
							) : (
								<CardDescription>{stat.label}</CardDescription>
							)}
							<CardTitle className="text-xl">{stat.value}</CardTitle>
							{Icon ? (
								<CardAction>
									<Icon className={`size-5 ${accentClass}`} />
								</CardAction>
							) : null}
						</CardHeader>
						{stat.description ? (
							<CardContent>
								<p className="text-muted-foreground text-xs/relaxed">
									{stat.description}
								</p>
							</CardContent>
						) : null}
					</Card>
				);
			})}
		</section>
	);
}
