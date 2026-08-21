"use client";

import { FileUpIcon, ShieldAlertIcon } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "~/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import type { QaTicketLogInput } from "~/shared/common/admin-crud/qa-ticket.types";
import {
	QA_TICKET_CONSOLE_LOG_EXTENSIONS,
	QA_TICKET_LOG_MAX_BYTES,
	QA_TICKET_NETWORK_LOG_EXTENSIONS,
} from "~/shared/common/admin-crud/qa-ticket-evidence.constants";

type LogFieldKind = "console" | "network";

function byteSize(value: string) {
	return new TextEncoder().encode(value).byteLength;
}

function formatBytes(value: number) {
	if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MiB`;
	if (value >= 1024) return `${(value / 1024).toFixed(1)} KiB`;
	return `${value} B`;
}

function extensionOf(fileName: string) {
	return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function QaTicketLogFields({
	consoleLog,
	networkLog,
	disabled,
	onConsoleLogChange,
	onNetworkLogChange,
}: {
	consoleLog: QaTicketLogInput;
	networkLog: QaTicketLogInput;
	disabled?: boolean;
	onConsoleLogChange: (value: QaTicketLogInput) => void;
	onNetworkLogChange: (value: QaTicketLogInput) => void;
}) {
	const [importError, setImportError] = useState<string | null>(null);

	const importFile = async (kind: LogFieldKind, file: File) => {
		setImportError(null);
		const allowed =
			kind === "console"
				? QA_TICKET_CONSOLE_LOG_EXTENSIONS
				: QA_TICKET_NETWORK_LOG_EXTENSIONS;
		if (!(allowed as readonly string[]).includes(extensionOf(file.name))) {
			setImportError(
				kind === "console"
					? "Consola admite archivos .txt o .log."
					: "Network admite archivos .har, .json o .txt.",
			);
			return;
		}
		if (file.size > QA_TICKET_LOG_MAX_BYTES) {
			setImportError("El archivo supera el máximo de 1 MiB.");
			return;
		}

		const next = {
			content: await file.text(),
			fileName: file.name,
			mimeType: file.type || "text/plain",
		};
		if (byteSize(next.content) > QA_TICKET_LOG_MAX_BYTES) {
			setImportError("El texto UTF-8 supera el máximo de 1 MiB.");
			return;
		}

		if (kind === "console") onConsoleLogChange(next);
		else onNetworkLogChange(next);
	};

	const renderField = (
		kind: LogFieldKind,
		value: QaTicketLogInput,
		onChange: (value: QaTicketLogInput) => void,
	) => {
		const bytes = byteSize(value.content);
		const invalid = bytes > QA_TICKET_LOG_MAX_BYTES;
		const inputId = `qa-ticket-${kind}-log-file`;
		const textareaId = `qa-ticket-${kind}-log`;

		return (
			<Field data-invalid={invalid}>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<FieldLabel htmlFor={textareaId}>
						{kind === "console" ? "Consola" : "Network"}
					</FieldLabel>
					<Button aria-disabled={disabled} asChild size="sm" variant="outline">
						<label htmlFor={inputId}>
							<FileUpIcon data-icon="inline-start" />
							Importar archivo
						</label>
					</Button>
					<input
						accept={
							kind === "console" ? ".txt,.log,text/plain" : ".har,.json,.txt"
						}
						className="sr-only"
						disabled={disabled}
						id={inputId}
						onChange={(event) => {
							const file = event.target.files?.[0];
							if (file) void importFile(kind, file);
							event.target.value = "";
						}}
						type="file"
					/>
				</div>
				<Textarea
					aria-invalid={invalid}
					disabled={disabled}
					id={textareaId}
					onChange={(event) =>
						onChange({
							content: event.target.value,
							fileName: null,
							mimeType: null,
						})
					}
					placeholder={
						kind === "console"
							? "Pegá aquí errores o mensajes relevantes de consola"
							: "Pegá aquí requests, responses o el contenido de un HAR redactado"
					}
					rows={9}
					value={value.content}
				/>
				<FieldDescription>
					{formatBytes(bytes)} de 1 MiB
					{value.fileName ? ` · Importado desde ${value.fileName}` : ""}
				</FieldDescription>
				{invalid ? (
					<FieldError>El texto supera el máximo de 1 MiB.</FieldError>
				) : null}
			</Field>
		);
	};

	return (
		<div className="flex flex-col gap-3">
			<Alert>
				<ShieldAlertIcon />
				<AlertTitle>Redactá datos sensibles antes de guardar</AlertTitle>
				<AlertDescription>
					Consola y HAR pueden contener tokens, cookies, datos personales o
					payloads comerciales. El contenido queda privado para admins, pero no
					debe conservar secretos.
				</AlertDescription>
			</Alert>
			{importError ? (
				<Alert variant="destructive">
					<AlertTitle>No se pudo importar el archivo</AlertTitle>
					<AlertDescription>{importError}</AlertDescription>
				</Alert>
			) : null}
			<Tabs defaultValue="console">
				<TabsList>
					<TabsTrigger value="console">Consola</TabsTrigger>
					<TabsTrigger value="network">Network</TabsTrigger>
				</TabsList>
				<TabsContent value="console">
					{renderField("console", consoleLog, onConsoleLogChange)}
				</TabsContent>
				<TabsContent value="network">
					{renderField("network", networkLog, onNetworkLogChange)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
