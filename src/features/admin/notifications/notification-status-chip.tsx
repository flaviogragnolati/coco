import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { statusPresets } from "~/shared/common/admin-crud/status-presets";

const states = {
	accepted: { ...statusPresets.success, label: "Enviado" },
	pending: { ...statusPresets.inProgress, label: "Pendiente de envío" },
	processing: { ...statusPresets.inProgress, label: "Envío en curso" },
	skipped: { ...statusPresets.inert, label: "Aviso omitido" },
	review: { ...statusPresets.attention, label: "Requiere revisión" },
	missing: { ...statusPresets.inert, label: "Sin registro de mail" },
	unavailable: {
		...statusPresets.attention,
		label: "Estado de mail no disponible",
	},
	off: { ...statusPresets.inert, label: "Correo desactivado" },
};

export function NotificationStatusChip({
	status,
	test,
}: {
	status: keyof typeof states;
	test?: boolean;
}) {
	const config = states[status];
	return (
		<StatusChip
			config={
				test && status === "accepted"
					? { ...config, label: "Enviado en prueba" }
					: config
			}
		/>
	);
}
