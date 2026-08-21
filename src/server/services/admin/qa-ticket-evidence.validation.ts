import type { QaTicketLogInput } from "~/shared/common/admin-crud/qa-ticket.types";
import {
	QA_TICKET_CONSOLE_LOG_EXTENSIONS,
	QA_TICKET_IMAGE_MAX_BYTES,
	type QA_TICKET_IMAGE_MIME_TYPES,
	QA_TICKET_LOG_MAX_BYTES,
	QA_TICKET_NETWORK_LOG_EXTENSIONS,
} from "~/shared/common/admin-crud/qa-ticket-evidence.constants";
import { AdminCrudError } from "./_base/admin-crud.errors";

type QaImageMimeType = (typeof QA_TICKET_IMAGE_MIME_TYPES)[number];
type QaLogKind = "consoleLog" | "networkLog";

const UTF8_ENCODER = new TextEncoder();
const PATH_SEPARATORS = /[/\\]+/g;
const BASE64_PATTERN =
	/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export function utf8ByteSize(value: string) {
	return UTF8_ENCODER.encode(value).byteLength;
}

export function nextAvailableImageSlot(usedSlots: Iterable<number>) {
	const used = new Set(usedSlots);
	return [0, 1, 2, 3, 4].find((slot) => !used.has(slot));
}

export function normalizeEvidenceFileName(
	fileName: string | null | undefined,
	fallback: string,
) {
	const withoutControlCharacters = Array.from((fileName ?? "").normalize("NFC"))
		.filter((character) => {
			const code = character.charCodeAt(0);
			return code > 31 && code !== 127;
		})
		.slice(0, 255)
		.join("");
	const normalized = withoutControlCharacters
		.replace(PATH_SEPARATORS, "-")
		.trim();

	return normalized || fallback;
}

function extensionOf(fileName: string) {
	const lastDot = fileName.lastIndexOf(".");
	return lastDot >= 0 ? fileName.slice(lastDot + 1).toLowerCase() : "";
}

function detectedImageMimeType(bytes: Uint8Array): QaImageMimeType | null {
	if (
		bytes.length >= 3 &&
		bytes[0] === 0xff &&
		bytes[1] === 0xd8 &&
		bytes[2] === 0xff
	) {
		return "image/jpeg";
	}

	const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	if (
		bytes.length >= pngSignature.length &&
		pngSignature.every((byte, index) => bytes[index] === byte)
	) {
		return "image/png";
	}

	if (
		bytes.length >= 12 &&
		String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
		String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
	) {
		return "image/webp";
	}

	return null;
}

export function validateImageEvidence(input: {
	bytes: Uint8Array;
	fileName?: string | null;
	mimeType?: string | null;
}) {
	if (input.bytes.byteLength === 0) {
		throw new AdminCrudError("BAD_REQUEST", "La imagen está vacía");
	}

	if (input.bytes.byteLength > QA_TICKET_IMAGE_MAX_BYTES) {
		throw new AdminCrudError(
			"BAD_REQUEST",
			"La imagen supera el máximo de 2 MiB",
		);
	}

	const detectedMimeType = detectedImageMimeType(input.bytes);
	if (!detectedMimeType) {
		throw new AdminCrudError(
			"BAD_REQUEST",
			"La imagen debe ser JPEG, PNG o WebP",
		);
	}

	if (input.mimeType !== detectedMimeType) {
		throw new AdminCrudError(
			"BAD_REQUEST",
			"El contenido de la imagen no coincide con su tipo MIME",
		);
	}

	const fallbackExtension =
		detectedMimeType === "image/jpeg" ? "jpg" : detectedMimeType.split("/")[1];
	return {
		content: Buffer.from(input.bytes).toString("base64"),
		fileName: normalizeEvidenceFileName(
			input.fileName,
			`evidencia.${fallbackExtension}`,
		),
		mimeType: detectedMimeType,
		byteSize: input.bytes.byteLength,
	};
}

export function decodeEvidenceBase64(
	content: string,
	expectedByteSize?: number,
) {
	const maxEncodedLength = Math.ceil((QA_TICKET_IMAGE_MAX_BYTES * 4) / 3) + 4;
	if (
		!content ||
		content.length > maxEncodedLength ||
		content.length % 4 !== 0 ||
		!BASE64_PATTERN.test(content)
	) {
		throw new AdminCrudError("BAD_REQUEST", "La evidencia base64 es inválida");
	}

	const bytes = Buffer.from(content, "base64");
	if (bytes.toString("base64") !== content) {
		throw new AdminCrudError("BAD_REQUEST", "La evidencia base64 es inválida");
	}
	if (expectedByteSize !== undefined && bytes.byteLength !== expectedByteSize) {
		throw new AdminCrudError(
			"BAD_REQUEST",
			"El tamaño guardado de la evidencia no coincide con su contenido",
		);
	}

	return bytes;
}

export function validateLogEvidence(kind: QaLogKind, input: QaTicketLogInput) {
	const byteSize = utf8ByteSize(input.content);
	if (byteSize > QA_TICKET_LOG_MAX_BYTES) {
		throw new AdminCrudError(
			"BAD_REQUEST",
			`${kind === "consoleLog" ? "Consola" : "Network"} supera el máximo de 1 MiB`,
		);
	}

	const fileName = input.fileName
		? normalizeEvidenceFileName(input.fileName, "evidencia.txt")
		: null;
	if (fileName) {
		const allowedExtensions =
			kind === "consoleLog"
				? QA_TICKET_CONSOLE_LOG_EXTENSIONS
				: QA_TICKET_NETWORK_LOG_EXTENSIONS;
		if (
			!(allowedExtensions as readonly string[]).includes(extensionOf(fileName))
		) {
			throw new AdminCrudError(
				"BAD_REQUEST",
				`El archivo de ${kind === "consoleLog" ? "consola" : "network"} no tiene una extensión permitida`,
			);
		}
	}

	return {
		content: input.content,
		fileName,
		mimeType: input.mimeType?.trim().slice(0, 100) || null,
		byteSize,
	};
}
