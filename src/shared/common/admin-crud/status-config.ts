import type { LucideIcon } from "lucide-react";

export type StatusVariant =
	| "default"
	| "secondary"
	| "success"
	| "warning"
	| "info"
	| "destructive"
	| "outline";

export type StatusConfig = {
	label: string;
	variant: StatusVariant;
	icon?: LucideIcon;
	hint?: string;
};
