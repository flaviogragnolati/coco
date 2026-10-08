"use client";

import { Loader2Icon, UploadIcon } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import {
	PRODUCT_IMAGE_MAX_BYTES,
	PRODUCT_IMAGE_MIME_TYPES,
} from "~/shared/common/admin-crud/product-image.constants";

async function uploadErrorMessage(response: Response) {
	try {
		const body = (await response.json()) as { error?: string };
		return body.error || `La carga falló (${response.status})`;
	} catch {
		return `La carga falló (${response.status})`;
	}
}

export function ProductImageUpload({
	label,
	disabled,
	onUploaded,
	children,
}: {
	label: string;
	disabled?: boolean;
	onUploaded: (url: string) => void;
	children: ReactNode;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const upload = async (file: File) => {
		setError(null);
		if (!(PRODUCT_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
			setError(`${file.name}: solo se admiten JPEG, PNG o WebP.`);
			return;
		}
		if (file.size === 0 || file.size > PRODUCT_IMAGE_MAX_BYTES) {
			setError(`${file.name}: debe pesar entre 1 byte y 4 MiB.`);
			return;
		}

		const formData = new FormData();
		formData.set("file", file);
		setIsUploading(true);
		try {
			const response = await fetch("/api/admin/product-images", {
				method: "POST",
				body: formData,
			});
			if (!response.ok) {
				setError(await uploadErrorMessage(response));
				return;
			}
			const { url } = (await response.json()) as { url: string };
			onUploaded(url);
		} catch {
			setError("No se pudo conectar para subir la imagen.");
		} finally {
			setIsUploading(false);
		}
	};

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-start gap-2">
				<div className="min-w-0 flex-1">{children}</div>
				<Button
					aria-label={label}
					disabled={disabled || isUploading}
					onClick={() => inputRef.current?.click()}
					title={label}
					type="button"
					variant="outline"
				>
					{isUploading ? (
						<Loader2Icon className="animate-spin" data-icon="inline-start" />
					) : (
						<UploadIcon data-icon="inline-start" />
					)}
					Subir
				</Button>
				<input
					accept={PRODUCT_IMAGE_MIME_TYPES.join(",")}
					className="hidden"
					onChange={(event) => {
						const file = event.target.files?.[0];
						event.target.value = "";
						if (file) void upload(file);
					}}
					ref={inputRef}
					type="file"
				/>
			</div>
			{error ? (
				<p className="text-destructive text-sm" role="alert">
					{error}
				</p>
			) : null}
		</div>
	);
}
