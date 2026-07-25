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
import { cn } from "~/lib/utils";

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

/** Medallion tints follow the badge formula: soft surface + accent ink. */
const accentMedallionClass: Record<CrudStatAccent, string> = {
	default: "bg-brand-soft text-brand-soft-foreground",
	success: "bg-success/10 text-success dark:bg-success/20",
	warning: "bg-warning/10 text-warning dark:bg-warning/20",
	info: "bg-info/10 text-info dark:bg-info/20",
	destructive: "bg-destructive/10 text-destructive dark:bg-destructive/20",
};

export function CrudStatsCards({ stats }: { stats: CrudStatItem[] }) {
	return (
		<section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			{stats.map((stat) => {
				const Icon = stat.icon;
				const medallionClass = accentMedallionClass[stat.accent ?? "default"];

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
									<span
										className={cn(
											"flex size-8 shrink-0 items-center justify-center rounded-full",
											medallionClass,
										)}
									>
										<Icon className="size-4" />
									</span>
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
