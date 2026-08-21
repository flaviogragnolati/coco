"use client";

import { ImagePlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import type { QaTicketEvidenceMetadata } from "~/shared/common/admin-crud/qa-ticket.types";
import {
	QA_TICKET_IMAGE_MAX_BYTES,
	QA_TICKET_IMAGE_MAX_COUNT,
	QA_TICKET_IMAGE_MIME_TYPES,
} from "~/shared/common/admin-crud/qa-ticket-evidence.constants";

type PendingUpload = {
	id: string;
	file: File;
	previewUrl: string;
	status: "uploading" | "failed";
	error?: string;
};

function formatBytes(value: number) {
	if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MiB`;
	if (value >= 1024) return `${(value / 1024).toFixed(1)} KiB`;
	return `${value} B`;
}

async function responseError(response: Response) {
	try {
		const body = (await response.json()) as { error?: string };
		return body.error || `La carga falló (${response.status})`;
	} catch {
		return `La carga falló (${response.status})`;
	}
}

export function QaTicketImages({
	ticketId,
	images,
	disabled,
	onEvidenceChanged,
}: {
	ticketId: number;
	images: QaTicketEvidenceMetadata[];
	disabled?: boolean;
	onEvidenceChanged: () => Promise<void> | void;
}) {
	const [uploads, setUploads] = useState<PendingUpload[]>([]);
	const [error, setError] = useState<string | null>(null);
	const uploadRef = useRef<PendingUpload[]>([]);

	useEffect(() => {
		uploadRef.current = uploads;
	}, [uploads]);

	useEffect(
		() => () => {
			for (const upload of uploadRef.current) {
				URL.revokeObjectURL(upload.previewUrl);
			}
		},
		[],
	);

	const upload = async (item: PendingUpload) => {
		setUploads((current) =>
			current.map((candidate) =>
				candidate.id === item.id
					? { ...candidate, status: "uploading", error: undefined }
					: candidate,
			),
		);
		const formData = new FormData();
		formData.set("file", item.file);

		try {
			const response = await fetch(`/api/admin/qa-tickets/${ticketId}/images`, {
				method: "POST",
				body: formData,
			});
			if (!response.ok) throw new Error(await responseError(response));
		} catch (cause) {
			const message =
				cause instanceof Error ? cause.message : "No se pudo cargar la imagen";
			setUploads((current) =>
				current.map((candidate) =>
					candidate.id === item.id
						? { ...candidate, status: "failed", error: message }
						: candidate,
				),
			);
			return;
		}

		URL.revokeObjectURL(item.previewUrl);
		setUploads((current) =>
			current.filter((candidate) => candidate.id !== item.id),
		);
		try {
			await onEvidenceChanged();
		} catch {
			setError(
				"La imagen quedó guardada, pero no se pudo refrescar la vista. Cerrá y volvé a abrir el ticket.",
			);
		}
	};

	const addFiles = async (files: File[]) => {
		setError(null);
		const available =
			QA_TICKET_IMAGE_MAX_COUNT - images.length - uploads.length;
		if (available <= 0) {
			setError(
				"El ticket ya tiene cinco imágenes entre guardadas y pendientes.",
			);
			return;
		}
		if (files.length > available) {
			setError(`Solo quedan ${available} lugares disponibles para imágenes.`);
		}

		for (const file of files.slice(0, available)) {
			if (
				!(QA_TICKET_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)
			) {
				setError(`${file.name}: solo se admiten JPEG, PNG o WebP.`);
				continue;
			}
			if (file.size === 0 || file.size > QA_TICKET_IMAGE_MAX_BYTES) {
				setError(`${file.name}: debe pesar entre 1 byte y 2 MiB.`);
				continue;
			}

			const item: PendingUpload = {
				id: crypto.randomUUID(),
				file,
				previewUrl: URL.createObjectURL(file),
				status: "uploading",
			};
			setUploads((current) => [...current, item]);
			await upload(item);
		}
	};

	const remove = async (imageId: number) => {
		setError(null);
		let response: Response;
		try {
			response = await fetch(`/api/admin/qa-ticket-evidence/${imageId}`, {
				method: "DELETE",
			});
		} catch {
			setError("No se pudo conectar para eliminar la imagen.");
			return;
		}
		if (!response.ok) {
			setError(await responseError(response));
			return;
		}
		try {
			await onEvidenceChanged();
		} catch {
			setError(
				"La imagen se eliminó, pero no se pudo refrescar la vista. Cerrá y volvé a abrir el ticket.",
			);
		}
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h3 className="font-medium">Imágenes</h3>
					<p className="text-muted-foreground text-sm">
						{images.length} de {QA_TICKET_IMAGE_MAX_COUNT} guardadas · JPEG, PNG
						o WebP · 2 MiB cada una
					</p>
				</div>
				<Button aria-disabled={disabled} asChild size="sm" variant="outline">
					<label htmlFor="qa-ticket-image-input">
						<ImagePlusIcon data-icon="inline-start" />
						Agregar imágenes
					</label>
				</Button>
				<input
					accept={QA_TICKET_IMAGE_MIME_TYPES.join(",")}
					className="sr-only"
					disabled={disabled}
					id="qa-ticket-image-input"
					multiple
					onChange={(event) => {
						void addFiles(Array.from(event.target.files ?? []));
						event.target.value = "";
					}}
					type="file"
				/>
			</div>

			{error ? (
				<Alert variant="destructive">
					<AlertTitle>No se pudo actualizar la evidencia</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{images.map((image) => (
					<Card key={image.id} size="sm">
						<CardHeader>
							<CardTitle className="truncate text-sm">
								{image.fileName ?? `Imagen ${image.slot + 1}`}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Image
								alt={image.fileName ?? `Evidencia ${image.slot + 1}`}
								className="aspect-video w-full rounded-2xl object-contain"
								height={360}
								loading="lazy"
								src={`/api/admin/qa-ticket-evidence/${image.id}`}
								unoptimized
								width={640}
							/>
						</CardContent>
						<CardFooter className="justify-between gap-2">
							<span className="text-muted-foreground text-xs">
								{formatBytes(image.byteSize)}
							</span>
							<Button
								aria-label={`Eliminar ${image.fileName ?? `imagen ${image.slot + 1}`}`}
								disabled={disabled}
								onClick={() => void remove(image.id)}
								size="icon-sm"
								type="button"
								variant="destructive"
							>
								<Trash2Icon />
							</Button>
						</CardFooter>
					</Card>
				))}

				{uploads.map((item) => (
					<Card key={item.id} size="sm">
						<CardHeader>
							<CardTitle className="truncate text-sm">
								{item.file.name}
							</CardTitle>
							<Badge
								variant={item.status === "failed" ? "destructive" : "outline"}
							>
								{item.status === "failed" ? "Falló" : "Cargando"}
							</Badge>
						</CardHeader>
						<CardContent className="flex flex-col gap-2">
							<Image
								alt={`Preview local de ${item.file.name}`}
								className="aspect-video w-full rounded-2xl object-contain"
								height={360}
								src={item.previewUrl}
								unoptimized
								width={640}
							/>
							{item.error ? (
								<p className="text-destructive text-xs">{item.error}</p>
							) : null}
						</CardContent>
						{item.status === "failed" ? (
							<CardFooter>
								<Button
									disabled={disabled}
									onClick={() => {
										setError(null);
										void upload(item);
									}}
									size="sm"
									type="button"
									variant="outline"
								>
									<RefreshCwIcon data-icon="inline-start" />
									Reintentar
								</Button>
							</CardFooter>
						) : null}
					</Card>
				))}
			</div>
		</div>
	);
}
