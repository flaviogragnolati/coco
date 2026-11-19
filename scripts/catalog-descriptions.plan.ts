import { productUpdateInputSchema } from "~/schemas/admin/product.schemas";
import type {
	ProductDetail,
	ProductUpdateInput,
} from "~/shared/common/admin-crud/product.types";
import type { CatalogDescription } from "./catalog-descriptions.data";

export type DescriptionStep =
	| {
			kind: "change";
			productId: number;
			name: string;
			before: string | null;
			after: string;
	  }
	| { kind: "skip"; productId: number; name: string; description: string }
	| { kind: "blocked"; productId: number; name: string; reason: string };

export type DescriptionArgs = {
	apply: boolean;
	confirmProduction: boolean;
	actorEmail: string | null;
};

/**
 * Why `product` cannot take `entry`'s description, or null when it can. A
 * product whose name drifted from the data file may no longer be the product
 * the text was written for.
 */
function blockReason(
	entry: CatalogDescription,
	product: ProductDetail | undefined,
): string | null {
	if (!product) return "no existe en esta base";
	if (product.deleted) return "está eliminado";
	if (product.name !== entry.name) {
		return `se llama "${product.name}" y el archivo de datos espera "${entry.name}"`;
	}
	return null;
}

const UNCHANGED_FIELDS = [
	"name",
	"cartImageUrl",
	"cardImageUrl",
	"images",
	"unit",
	"presentationContainer",
	"presentationSize",
	"brand",
	"category",
	"defaultSupplier",
	"active",
] as const;

function savedValue(input: ProductUpdateInput, field: string): unknown {
	switch (field) {
		case "brand":
			return input.brandAssignment.mode === "existing"
				? input.brandAssignment.brandId
				: null;
		case "category":
			return input.categoryId;
		case "defaultSupplier":
			return input.defaultSupplierId ?? null;
		default:
			return input[field as keyof ProductUpdateInput] ?? null;
	}
}

function currentValue(product: ProductDetail, field: string): unknown {
	switch (field) {
		case "brand":
			return product.brand?.id ?? null;
		case "category":
			return product.category?.id ?? null;
		case "defaultSupplier":
			return product.defaultSupplier?.id ?? null;
		default:
			return product[field as keyof ProductDetail] ?? null;
	}
}

/**
 * The admin update input that saves `description` and leaves every other field
 * as `product` has it. The admin service rewrites the whole product, so the
 * input is checked field by field: anything the form schema would normalize
 * (a trimmed name, an image URL it rejects) blocks the write instead.
 */
export function buildDescriptionUpdate(
	product: ProductDetail,
	description: string,
): { input: ProductUpdateInput } | { problem: string } {
	if (!product.category) return { problem: "no tiene categoría" };
	const parsed = productUpdateInputSchema.safeParse({
		id: product.id,
		name: product.name,
		description,
		cartImageUrl: product.cartImageUrl ?? undefined,
		cardImageUrl: product.cardImageUrl ?? undefined,
		images: product.images,
		unit: product.unit,
		presentationContainer: product.presentationContainer ?? undefined,
		presentationSize: product.presentationSize ?? undefined,
		brandAssignment: product.brand
			? { mode: "existing", brandId: product.brand.id }
			: { mode: "none" },
		categoryId: product.category.id,
		defaultSupplierId: product.defaultSupplier?.id,
		active: product.active,
	});
	if (!parsed.success) {
		const issues = parsed.error.issues
			.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
			.join("; ");
		return { problem: `el formulario de admin lo rechaza (${issues})` };
	}
	if (parsed.data.description !== description) {
		return { problem: "la descripción no se guardaría tal cual" };
	}
	const drifted = UNCHANGED_FIELDS.filter(
		(field) =>
			JSON.stringify(savedValue(parsed.data, field)) !==
			JSON.stringify(currentValue(product, field)),
	);
	if (drifted.length > 0) {
		return { problem: `guardar cambiaría también ${drifted.join(", ")}` };
	}
	return { input: parsed.data };
}

export function planDescriptions(
	entries: readonly CatalogDescription[],
	products: readonly ProductDetail[],
): DescriptionStep[] {
	const byId = new Map(products.map((product) => [product.id, product]));
	return entries.map((entry) => {
		const product = byId.get(entry.productId);
		const reason = blockReason(entry, product);
		if (reason || !product) {
			return {
				kind: "blocked",
				productId: entry.productId,
				name: entry.name,
				reason: reason ?? "no existe en esta base",
			};
		}
		if (product.description === entry.description) {
			return {
				kind: "skip",
				productId: entry.productId,
				name: entry.name,
				description: entry.description,
			};
		}
		const update = buildDescriptionUpdate(product, entry.description);
		if ("problem" in update) {
			return {
				kind: "blocked",
				productId: entry.productId,
				name: entry.name,
				reason: update.problem,
			};
		}
		return {
			kind: "change",
			productId: entry.productId,
			name: entry.name,
			before: product.description,
			after: entry.description,
		};
	});
}

/** Product ids or names the data file lists twice: each must point at one product. */
export function findDuplicateEntries(entries: readonly CatalogDescription[]) {
	const seen = new Set<string>();
	const duplicates: string[] = [];
	for (const entry of entries) {
		for (const key of [`#${entry.productId}`, entry.name]) {
			if (seen.has(key)) duplicates.push(key);
			seen.add(key);
		}
	}
	return duplicates;
}

export type ApplyOutcome =
	| { kind: "applied" }
	| { kind: "skipped" }
	| { kind: "conflict"; reason: string };

export type DescriptionService = {
	getById: (id: number) => Promise<ProductDetail>;
	update: (input: ProductUpdateInput) => Promise<unknown>;
};

/**
 * Re-reads the product right before writing, so a change made in the admin
 * after the dry-run read is never overwritten blindly.
 */
export async function applyDescription(
	entry: CatalogDescription,
	service: DescriptionService,
): Promise<ApplyOutcome> {
	const product = await service.getById(entry.productId);
	const reason = blockReason(entry, product);
	if (reason) return { kind: "conflict", reason };
	if (product.description === entry.description) return { kind: "skipped" };
	const update = buildDescriptionUpdate(product, entry.description);
	if ("problem" in update) return { kind: "conflict", reason: update.problem };
	await service.update(update.input);
	return { kind: "applied" };
}

export function parseDescriptionArgs(argv: readonly string[]): DescriptionArgs {
	const args: DescriptionArgs = {
		apply: false,
		confirmProduction: false,
		actorEmail: null,
	};
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index] ?? "";
		if (arg === "--apply") args.apply = true;
		else if (arg === "--confirm-production") args.confirmProduction = true;
		else if (arg === "--actor-email") {
			const value = argv[index + 1];
			if (!value || value.startsWith("--")) {
				throw new Error("--actor-email necesita un email.");
			}
			args.actorEmail = value.trim();
			index += 1;
		} else if (arg.startsWith("--actor-email=")) {
			args.actorEmail = arg.slice("--actor-email=".length).trim();
		} else {
			throw new Error(
				`Argumento desconocido: ${arg}. Se aceptan --apply, --actor-email <email> y --confirm-production.`,
			);
		}
	}
	if (args.apply && !args.actorEmail) {
		throw new Error(
			"--apply necesita --actor-email <email> de un superadmin activo: cada cambio queda en AuditLog a su nombre.",
		);
	}
	return args;
}

/**
 * The dry run only reads, inside a read-only transaction, so it runs anywhere.
 * Writing to a database that declares itself production takes a second flag.
 */
export function assertApplyAllowed(appEnv: string, args: DescriptionArgs) {
	if (args.apply && appEnv === "production" && !args.confirmProduction) {
		throw new Error(
			"APP_ENV=production: --apply escribe las descripciones de los productos de esta base. Si es la base correcta, repetir con --apply --confirm-production.",
		);
	}
}
