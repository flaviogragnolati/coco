"use client";

import { useMemo } from "react";
import { Button } from "~/components/ui/button";
import {
	DetailDisclosure,
	DetailEmpty,
	DetailField,
	DetailGrid,
} from "~/features/admin/crud/_components/crud-detail";
import { CrudDetailDialogShell } from "~/features/admin/crud/_components/crud-detail-dialog-shell";
import { buildEmailPreviewDocument } from "~/features/admin/notifications/email-preview-document";
import { NotificationStatusChip } from "~/features/admin/notifications/notification-status-chip";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import { api } from "~/trpc/react";

export function NotificationDetail({
	id,
	onClose,
}: {
	id: string;
	onClose: () => void;
}) {
	const query = api.admin.notification.getById.useQuery(
		{ id },
		{
			refetchOnWindowFocus: true,
			refetchInterval: (query) => {
				const status = query.state.data?.status;
				return status === "pending" || status === "processing" ? 15_000 : false;
			},
		},
	);
	const detail = query.data;
	const preview = useMemo(
		() => (detail?.html ? buildEmailPreviewDocument(detail.html) : null),
		[detail?.html],
	);
	return (
		<CrudDetailDialogShell
			contentClassName="sm:max-w-3xl"
			description={
				detail ? `Pedido ${detail.orderCode}` : "Detalle del correo registrado."
			}
			errorMessage={
				query.isError ? "No se pudo consultar este mail." : undefined
			}
			eyebrow={detail?.mode === "test" ? "Mail de prueba" : "Mail de pedido"}
			footer={
				<>
					{query.isError ? (
						<Button onClick={() => void query.refetch()} variant="outline">
							Reintentar
						</Button>
					) : null}
					<Button onClick={onClose} variant="outline">
						Cerrar
					</Button>
				</>
			}
			isLoading={query.isLoading}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			open
			status={
				detail ? (
					<NotificationStatusChip
						status={detail.status}
						test={detail.mode === "test"}
					/>
				) : null
			}
			title={detail?.subject ?? "Detalle del mail"}
		>
			{detail ? (
				<>
					<DetailGrid columns={2}>
						<DetailField label="Destinatario">
							{detail.to ?? "Aún sin registrar"}
						</DetailField>
						<DetailField label="Remitente">
							{detail.from ?? "Aún sin registrar"}
						</DetailField>
						<DetailField label="Última actualización">
							{formatDateTimeShort(new Date(detail.updatedAt))}
						</DetailField>
						<DetailField label="Intentos">{detail.attempts}</DetailField>
						{detail.status === "accepted" ? (
							<DetailField label="Aceptado por el proveedor">
								{detail.providerId ?? "Sin identificador registrado"}
							</DetailField>
						) : null}
						{detail.lastError ? (
							<DetailField label="Motivo registrado">
								{detail.lastError}
							</DetailField>
						) : null}
					</DetailGrid>
					{preview ? (
						<iframe
							className="h-[min(56vh,32rem)] w-full rounded-xl border bg-white"
							referrerPolicy="no-referrer"
							sandbox=""
							srcDoc={preview}
							title="Vista previa del mail original"
						/>
					) : null}
					{detail.text ? (
						<DetailDisclosure title="Versión de texto">
							<p className="whitespace-pre-wrap break-words text-sm">
								{detail.text}
							</p>
						</DetailDisclosure>
					) : null}
					{!preview && !detail.text ? (
						<DetailEmpty>Contenido aún no disponible.</DetailEmpty>
					) : null}
				</>
			) : null}
		</CrudDetailDialogShell>
	);
}
