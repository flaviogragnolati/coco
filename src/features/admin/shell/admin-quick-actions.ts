import { BookOpenIcon, type LucideIcon } from "lucide-react";

export type AdminQuickActionId = "glossary";

export type AdminQuickAction = {
	id: AdminQuickActionId;
	label: string;
	description: string;
	icon: LucideIcon;
};

/**
 * Shortcuts the floating button offers on every `/admin` route, mirroring how
 * `admin-nav.ts` is the single source of the sidebar.
 *
 * The list's length drives the button's shape: with exactly one action the FAB
 * opens it directly, with two or more it opens a popover listing them. Adding
 * an action here is therefore enough — the FAB needs no change.
 */
export const adminQuickActions: AdminQuickAction[] = [
	{
		id: "glossary",
		label: "Glosario",
		description: "Términos, entidades y estados de la aplicación",
		icon: BookOpenIcon,
	},
];
