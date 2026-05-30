import { Badge } from "~/components/ui/badge";

export function CrudStatusBadge({
	active,
	deleted,
}: {
	active: boolean;
	deleted?: boolean;
}) {
	if (deleted) {
		return <Badge variant="destructive">Eliminado</Badge>;
	}

	return active ? (
		<Badge>Activo</Badge>
	) : (
		<Badge variant="secondary">Inactivo</Badge>
	);
}
