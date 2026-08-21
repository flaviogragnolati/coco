import { describe, expect, it } from "vitest";

import {
	QA_TICKET_IMAGE_MAX_BYTES,
	QA_TICKET_LOG_MAX_BYTES,
} from "~/shared/common/admin-crud/qa-ticket-evidence.constants";
import { AdminCrudError } from "./_base/admin-crud.errors";
import {
	decodeEvidenceBase64,
	nextAvailableImageSlot,
	normalizeEvidenceFileName,
	utf8ByteSize,
	validateImageEvidence,
	validateLogEvidence,
} from "./qa-ticket-evidence.validation";

const signatures = {
	"image/jpeg": [0xff, 0xd8, 0xff, 0xe0],
	"image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
	"image/webp": [
		0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
	],
} as const;

describe("QA ticket evidence validation", () => {
	for (const [mimeType, signature] of Object.entries(signatures)) {
		it(`accepts ${mimeType} by signature and MIME`, () => {
			const result = validateImageEvidence({
				bytes: Uint8Array.from(signature),
				fileName: "capture.test",
				mimeType,
			});

			expect(result.mimeType).toBe(mimeType);
			expect(result.byteSize).toBe(signature.length);
			expect(decodeEvidenceBase64(result.content)).toEqual(
				Buffer.from(signature),
			);
		});
	}

	it("rejects empty, unsupported, mismatched and oversized images", () => {
		const invalidInputs = [
			{ bytes: new Uint8Array(), mimeType: "image/png" },
			{ bytes: Uint8Array.from([0x47, 0x49, 0x46]), mimeType: "image/gif" },
			{
				bytes: Uint8Array.from(signatures["image/png"]),
				mimeType: "image/jpeg",
			},
			{
				bytes: new Uint8Array(QA_TICKET_IMAGE_MAX_BYTES + 1),
				mimeType: "image/png",
			},
		];

		for (const input of invalidInputs) {
			expect(() => validateImageEvidence(input)).toThrow(AdminCrudError);
		}
	});

	it("accepts exactly 2 MiB when the signature is valid", () => {
		const bytes = new Uint8Array(QA_TICKET_IMAGE_MAX_BYTES);
		bytes.set(signatures["image/png"]);
		expect(
			validateImageEvidence({ bytes, mimeType: "image/png" }).byteSize,
		).toBe(QA_TICKET_IMAGE_MAX_BYTES);
	});

	it("measures UTF-8 logs and rejects one byte over the limit", () => {
		const exact = "a".repeat(QA_TICKET_LOG_MAX_BYTES);
		expect(
			validateLogEvidence("consoleLog", {
				content: exact,
				fileName: null,
				mimeType: null,
			}).byteSize,
		).toBe(QA_TICKET_LOG_MAX_BYTES);

		expect(() =>
			validateLogEvidence("networkLog", {
				content: `${exact}é`,
				fileName: null,
				mimeType: null,
			}),
		).toThrow(AdminCrudError);
		expect(utf8ByteSize("é")).toBe(2);
	});

	it("enforces the import extension allowlists", () => {
		expect(() =>
			validateLogEvidence("consoleLog", {
				content: "ok",
				fileName: "console.har",
				mimeType: "text/plain",
			}),
		).toThrow(AdminCrudError);
		expect(
			validateLogEvidence("networkLog", {
				content: "{}",
				fileName: "network.har",
				mimeType: "application/json",
			}).fileName,
		).toBe("network.har");
	});

	it("sanitizes filenames and rejects corrupt base64", () => {
		expect(
			normalizeEvidenceFileName("../foo\\bar\u0000.png", "fallback.png"),
		).toBe("..-foo-bar.png");
		expect(() => decodeEvidenceBase64("not base64")).toThrow(AdminCrudError);
		expect(() => decodeEvidenceBase64("YWJj", 2)).toThrow(AdminCrudError);
	});

	it("allocates five image slots and reuses a deleted slot", () => {
		expect(nextAvailableImageSlot([])).toBe(0);
		expect(nextAvailableImageSlot([0, 1, 2, 3])).toBe(4);
		expect(nextAvailableImageSlot([0, 1, 3, 4])).toBe(2);
		expect(nextAvailableImageSlot([0, 1, 2, 3, 4])).toBeUndefined();
	});
});
