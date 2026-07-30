"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const CONFIRMATION_MS = 1500;

/**
 * The repo's only clipboard consumer for now; if a second one appears this
 * belongs in `shared/common/`.
 */
export function CopyIdentifierButton({
	value,
	className,
}: {
	value: string;
	className?: string;
}) {
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!copied) return;
		const timeout = setTimeout(() => setCopied(false), CONFIRMATION_MS);
		return () => clearTimeout(timeout);
	}, [copied]);

	const copy = async () => {
		// `navigator.clipboard` only exists in secure contexts (https/localhost).
		if (!navigator.clipboard) {
			toast.error("El portapapeles no está disponible en este contexto");
			return;
		}

		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			toast.success(`Copiado: ${value}`);
		} catch {
			toast.error("No se pudo copiar al portapapeles");
		}
	};

	return (
		<Button
			aria-label={`Copiar ${value}`}
			className={cn("shrink-0", className)}
			onClick={copy}
			size="icon-xs"
			type="button"
			variant="ghost"
		>
			{copied ? <CheckIcon /> : <CopyIcon />}
		</Button>
	);
}
