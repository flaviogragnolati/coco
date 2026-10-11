"use client";

import { DownloadIcon, Loader2Icon, UploadIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import type {
	PriceSheetApplyResult,
	PriceSheetPreview,
} from "~/shared/common/admin-crud/price-sheet.types";
import { PriceSheetPreviewDialog } from "./price-sheet-preview-dialog";

const PRICE_SHEET_URL = "/api/admin/price-sheet";

async function postSheet<T>(path: string, formData: FormData): Promise<T> {
	const response = await fetch(`${PRICE_SHEET_URL}${path}`, {
		method: "POST",
		body: formData,
	});
	const body = (await response.json().catch(() => null)) as
		| (T & { error?: string })
		| null;
	if (!response.ok || !body) {
		throw new Error(body?.error || `La solicitud falló (${response.status})`);
	}
	return body;
}

function messageOf(cause: unknown, fallback: string) {
	return cause instanceof Error && cause.message ? cause.message : fallback;
}

function attachmentName(response: Response) {
	const header = response.headers.get("content-disposition") ?? "";
	return /filename="([^"]+)"/.exec(header)?.[1] ?? "precios.xlsx";
}

async function downloadSheet() {
	const response = await fetch(PRICE_SHEET_URL);
	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(body?.error || `La descarga falló (${response.status})`);
	}
	const url = URL.createObjectURL(await response.blob());
	const link = document.createElement("a");
	link.href = url;
	link.download = attachmentName(response);
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Download the price sheet, upload it edited, preview and confirm. */
export function PriceSheetActions({
	onApplied,
}: {
	onApplied: () => Promise<void> | void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [open, setOpen] = useState(false);
	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<PriceSheetPreview | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isApplying, setIsApplying] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);

	const download = async () => {
		setIsDownloading(true);
		try {
			await downloadSheet();
		} catch (cause) {
			toast.error(messageOf(cause, "No se pudo descargar la planilla"));
		} finally {
			setIsDownloading(false);
		}
	};

	const loadPreview = async (selected: File) => {
		setFile(selected);
		setPreview(null);
		setError(null);
		setOpen(true);
		setIsLoading(true);
		const formData = new FormData();
		formData.set("file", selected);
		try {
			setPreview(await postSheet<PriceSheetPreview>("/preview", formData));
		} catch (cause) {
			setError(messageOf(cause, "No se pudo leer la planilla"));
		} finally {
			setIsLoading(false);
		}
	};

	const apply = async () => {
		if (!file || !preview?.canApply) return;
		setIsApplying(true);
		setError(null);
		const formData = new FormData();
		formData.set("file", file);
		formData.set("expected", JSON.stringify(preview.changes));
		try {
			const result = await postSheet<PriceSheetApplyResult>("/apply", formData);
			toast.success(
				`Planilla aplicada: ${result.priceCount} precio${result.priceCount === 1 ? "" : "s"} y ${result.categoryCount} categoría${result.categoryCount === 1 ? "" : "s"} actualizados`,
			);
			setOpen(false);
			setPreview(null);
			setFile(null);
			await onApplied();
		} catch (cause) {
			setError(messageOf(cause, "No se pudo aplicar la planilla"));
		} finally {
			setIsApplying(false);
		}
	};

	return (
		<>
			<div className="flex flex-wrap gap-2">
				<Button
					disabled={isDownloading}
					onClick={() => void download()}
					type="button"
					variant="outline"
				>
					{isDownloading ? (
						<Loader2Icon className="animate-spin" data-icon="inline-start" />
					) : (
						<DownloadIcon data-icon="inline-start" />
					)}
					Descargar planilla de precios
				</Button>
				<Button
					onClick={() => inputRef.current?.click()}
					type="button"
					variant="outline"
				>
					<UploadIcon data-icon="inline-start" />
					Subir planilla
				</Button>
				<input
					accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
					className="hidden"
					onChange={(event) => {
						const selected = event.target.files?.[0];
						event.target.value = "";
						if (selected) void loadPreview(selected);
					}}
					ref={inputRef}
					type="file"
				/>
			</div>
			<PriceSheetPreviewDialog
				error={error}
				fileName={file?.name ?? null}
				isApplying={isApplying}
				isLoading={isLoading}
				onChooseFile={() => inputRef.current?.click()}
				onConfirm={() => void apply()}
				onOpenChange={setOpen}
				open={open}
				preview={preview}
			/>
		</>
	);
}
