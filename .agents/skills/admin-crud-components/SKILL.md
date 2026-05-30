---
name: admin-crud-components
description: "Build admin CRUD handlers for this repository using the supplier-based pattern, for both standalone pages and owner forms that manage related records inline. Use when: creating or extending an admin CRUD entity, page, or owner form; wiring list/getById/getStats/create/update/delete flows; defining admin Zod schemas; handling embedded forms, related entity select/create, nested collection editors, owner-child CRUD, relationship assignment, tRPC procedures, Prisma-backed services with audit logging, transactional reconciliation, or supplier-style soft/hard delete behavior. Keywords: admin CRUD, embedded forms, related entity select/create, nested collection editors, owner-child CRUD, relationship assignment, transactional reconciliation, form dialog, delete dialog, Zod schema, React Hook Form, tRPC router, Prisma service, audit log, soft delete, hard delete, relation blocked, supplier pattern."
license: MIT
---

# Admin CRUD Components and Handlers

Use this skill to create a full admin CRUD slice that matches the current repository architecture.

This skill is not only about leaf UI components. In this codebase, an admin CRUD handler is a coordinated slice made of:

1. Zod schemas
2. Shared inferred types
3. Prisma data-access helpers
4. Service functions with transaction and audit logging
5. tRPC router procedures
6. App-level client orchestration
7. Entity-specific form and table components
8. Shared CRUD shells, dialogs, states, and filters

If you only build the dialog or the table and skip the rest of the slice, you will drift from the established pattern.

## When To Use This Skill

Use this skill when you need to:

- create a new admin CRUD handler under `src/app/admin/crud-home`
- add a new admin entity following the supplier pattern
- extend an existing admin CRUD page or owner form with new fields, filters, embedded related data, or delete behavior
- build entity form dialogs, tables, stats cards, delete flows, and embedded owner-form sections in admin
- wire Prisma, tRPC, React Hook Form, and Zod into one admin CRUD slice
- preserve the existing audit log and deletion rules used by the repository

Do not use this skill when you are:

- building public or customer-facing CRUD flows
- designing a bulk import or multi-step wizard unrelated to the existing admin CRUD pattern
- refactoring the CRUD architecture into factories, generators, or base classes unless explicitly requested
- changing auth, pagination, or i18n architecture as part of a normal entity addition

## Canonical Reference

The supplier implementation is the canonical example for this skill.

Read these files first when you need a concrete source of truth:

- `src/app/admin/crud-home/suppliers/_components/supplier-crud-client.tsx`
- `src/features/admin/crud/supplier/supplier-form-dialog.tsx`
- `src/features/admin/crud/supplier/supplier-table.tsx`
- `src/features/admin/crud/supplier/supplier.mappers.ts`
- `src/features/admin/crud/_components/crud-delete-dialog.tsx`
- `src/features/admin/crud/_components/crud-form-dialog-shell.tsx`
- `src/features/admin/crud/_components/crud-page-shell.tsx`
- `src/features/admin/crud/_components/crud-row-actions.tsx`
- `src/features/admin/crud/_components/crud-state.tsx`
- `src/features/admin/crud/_components/crud-stats-cards.tsx`
- `src/features/admin/crud/_components/crud-status-badge.tsx`
- `src/features/admin/crud/_lib/filter-helpers.ts`
- `src/shared/common/admin-crud/crud.types.ts`
- `src/shared/common/admin-crud/supplier.types.ts`
- `src/schemas/admin/supplier.schemas.ts`
- `src/server/api/routers/admin/supplier.router.ts`
- `src/server/api/routers/admin.router.ts`
- `src/server/services/admin/supplier.service.ts`
- `src/server/services/admin/supplier.data.ts`
- `src/server/services/admin/_base/admin-audit.ts`
- `src/server/services/admin/_base/admin-crud.errors.ts`

## Architecture At A Glance

The established data flow is:

```text
Zod schemas
  -> shared inferred types
  -> Prisma data layer
  -> service layer with transactions + audit logs
  -> tRPC router with input/output contracts
  -> page-level client orchestration
  -> entity form/table dialogs using shared CRUD components
```

Keep responsibilities separated:

- `src/schemas/admin/*` defines the runtime contracts.
- `src/shared/common/admin-crud/*` exports inferred types used across client and server.
- `src/server/services/admin/*.data.ts` owns raw Prisma reads and writes.
- `src/server/services/admin/*.service.ts` owns business rules, transactions, audit, and relation checks.
- `src/server/api/routers/admin/*.router.ts` owns transport-level validation and `TRPCError` mapping.
- `src/features/admin/crud/<entity>/*` owns entity-specific UI components and mappers.
- `src/app/admin/crud-home/<entity-plural>/*` owns page routing, queries, mutations, filters, and dialog state.

Do not collapse these layers into one file unless the user explicitly asks you to simplify the architecture.

## Embedded Forms Architecture

The supplier slice remains the canonical standalone reference. Embedded owner forms extend the same layering without changing the architecture.

This repository supports two inline-related-data patterns:

### Single Reference Select/Create

Use this when one owner selects or creates a single related row during the same submit, such as `Product -> Brand`.

- Model the form input as a discriminated union such as `none | existing | new`.
- Validate selected related rows server-side before assigning the foreign key.
- If the operator creates a related row inline, create it and assign its foreign key inside the same owner mutation transaction.
- Do not update shared related rows inline unless explicitly requested.

### Owned Collection Editor

Use this when the owner controls the lifecycle of dependent children, such as `User -> Address[]`.

- Owner detail schemas should include the child rows the form needs.
- Embedded child input should use optional `id` for existing rows and omit the parent foreign key when the owner determines it.
- Owner updates should reconcile children transactionally: validate ownership, update existing rows, create new rows, and soft-delete removed rows.
- Standalone child CRUD can still exist for direct management when the child needs its own screen.

Embedded writes belong in the owner service transaction, not in client-side mutation chains. The client should submit one owner payload and let the owner service validate and reconcile related records inside the same `database.$transaction()` block.

## Tabbed Multi-Entity CRUD Pages

Use this when a single admin route groups two or more closely related CRUD entities into tabs.

- Each tabbed entity still gets its own schema, shared types, data layer, service, router, form, table, and mappers.
- The page route owns tab state and shared layout only.
- Each tab panel owns independent search, status filter, include-deleted state, dialogs, queries, and mutations.
- Do not merge unrelated entities into one router or service just because they share a page.
- Use accessible tabs for grouped CRUD pages.

## Shared Building Blocks

These primitives already exist and should be reused instead of rebuilt.

### Generic Types

From `src/shared/common/admin-crud/crud.types.ts`:

- `CrudEntityId`
- `CrudModalMode`
- `CrudStatusFilter`
- `CrudModalState<TId>`
- `CrudMutationResult<TId>`
- `CrudColumn<TItem>`
- `CrudRowAction<TItem>`

These types define the modal state shape, table column contract, and row action contract. Reuse them instead of inventing parallel interfaces.

### Shared UI Components

From `src/features/admin/crud/_components`:

- `CrudPageShell`: page title, description, and top-level actions
- `CrudFormDialogShell`: modal wrapper for entity forms
- `CrudDeleteDialog`: soft/hard delete confirmation dialog, including typed confirmation
- `CrudTable`: generic table surface driven by `CrudColumn<TItem>`
- `CrudRowActions`: dropdown action menu for row-level actions
- `CrudStatusBadge`: active/inactive/deleted badge
- `CrudStatsCards`: summary cards for totals and status counts
- `CrudLoadingState`, `CrudEmptyState`, `CrudErrorState`: standard loading and failure surfaces

### Shared Client Helpers

From `src/features/admin/crud/_lib/filter-helpers.ts`:

- `normalizeSearch`
- `matchesSearch`
- `matchesCrudStatus`

Use these helpers for the current client-side filter pattern. Do not replace them with a different search implementation unless the feature explicitly requires server-side filtering.

### Shared Server Helpers

From `src/server/services/admin/_base`:

- `writeAdminAuditLog()` from `admin-audit.ts`
- `AdminCrudError` and `throwNotFound()` from `admin-crud.errors.ts`

Service code should stay transport-agnostic. Throw `AdminCrudError` in the service layer and map it to `TRPCError` in the router layer.

## Target File Layout For A New Entity

When you create a new admin CRUD slice, the expected file layout is usually:

```text
src/
  app/admin/crud-home/<entity-plural>/
    page.tsx
    _components/
      <entity>-crud-client.tsx

  features/admin/crud/<entity>/
    <entity>-form-dialog.tsx
    <entity>-table.tsx
    <entity>.mappers.ts

  schemas/admin/
    <entity>.schemas.ts

  shared/common/admin-crud/
    <entity>.types.ts

  server/api/routers/admin/
    <entity>.router.ts

  server/services/admin/
    <entity>.data.ts
    <entity>.service.ts
```

You will also usually update:

- `src/server/api/routers/admin.router.ts`
- any admin navigation or route entrypoint already present in the app

## Required Capability Checklist

Unless the user explicitly narrows scope, a complete admin CRUD handler in this repository should cover:

- list query
- getById query for edit mode
- stats query
- create mutation
- update mutation
- soft delete mutation
- hard delete mutation
- list schema
- detail schema
- stats schema
- create/update/delete input schemas
- shared inferred types
- page-level query and mutation orchestration
- table component
- form dialog component
- mappers for default values and edit-mode normalization when needed
- soft delete dialog
- hard delete dialog
- audit logging for mutations
- relation-blocked hard delete handling where applicable

If one of these pieces is intentionally omitted, document that in the implementation instead of silently diverging.

## Build Order

Follow this order. It mirrors the working supplier implementation and prevents downstream churn.

### 1. Define Zod Schemas First

Start in `src/schemas/admin/<entity>.schemas.ts`.

Create the full contract set up front:

- `<entity>IdSchema`
- `<entity>CreateInputSchema`
- `<entity>UpdateInputSchema`
- `<entity>DeleteInputSchema`
- `<entity>ListInputSchema`
- `<entity>ListItemSchema`
- `<entity>DetailSchema`
- `<entity>StatsSchema`
- `<entity>ListOutputSchema`

Use helper schemas when you have repeated trim-and-normalize behavior. The supplier schema is the right pattern for:

- required trimmed text
- optional trimmed text converted to `undefined`
- nested objects such as address and contact info
- `superRefine()` for cross-field validation

Example pattern:

```ts
import { z } from "zod";

const requiredText = (message: string) =>
	 z.string().trim().min(1, message);

const optionalText = z
	.string()
	.trim()
	.optional()
	.transform((value) => (value && value.length > 0 ? value : undefined));

export const entityIdSchema = z
	.number()
	.int("El id debe ser un número entero")
	.positive("El id debe ser positivo");

export const entityCreateInputSchema = z.object({
	name: requiredText("El nombre es obligatorio"),
	description: optionalText,
	active: z.boolean().default(true),
});

export const entityUpdateInputSchema = entityCreateInputSchema.extend({
	id: entityIdSchema,
});

export const entityDeleteInputSchema = z.object({
	id: entityIdSchema,
});

export const entityListInputSchema = z.object({
	includeDeleted: z.boolean().optional().default(false),
});
```

Rules:

- Zod is the source of truth.
- Do not hand-write duplicate TypeScript types for the same payload.
- Match the database shape that the client really consumes.
- Keep validation messages aligned with the repository's Spanish copy.

### 2. Export Shared Types From Schemas

After the schema exists, export inferred types from `src/shared/common/admin-crud/<entity>.types.ts`.

The exact names may vary by entity, but the pattern should stay stable:

```ts
import type { z } from "zod";

import {
	entityCreateInputSchema,
	entityDeleteInputSchema,
	entityDetailSchema,
	entityListInputSchema,
	entityListItemSchema,
	entityStatsSchema,
	entityUpdateInputSchema,
} from "~/schemas/admin/entity.schemas";

export type EntityCreateInput = z.output<typeof entityCreateInputSchema>;
export type EntityUpdateInput = z.output<typeof entityUpdateInputSchema>;
export type EntityDeleteInput = z.output<typeof entityDeleteInputSchema>;
export type EntityListInput = z.output<typeof entityListInputSchema>;
export type EntityListItem = z.output<typeof entityListItemSchema>;
export type EntityDetail = z.output<typeof entityDetailSchema>;
export type EntityStats = z.output<typeof entityStatsSchema>;

export type EntityFormInput = z.input<typeof entityCreateInputSchema>;
export type EntityFormValues = z.output<typeof entityCreateInputSchema>;
```

Rules:

- Reuse schema inference with `z.input<>` and `z.output<>`.
- Export a dedicated form input/output pair when the form uses the create schema.
- Keep these types in `shared/common/admin-crud` because both client and server use them.

### 3. Define Embedded Contracts When The Owner Form Writes Related Data

Add this step only when the owner form creates or reconciles related records inline.

For single reference select/create:

- define the owner form field as a discriminated union such as `none | existing | new`
- keep the related-row selection or creation contract in the owner schema, not as an ad hoc client-only type

For owned collections:

- include child rows in the owner detail schema so edit mode can reset from one payload
- define embedded child input with optional `id` for existing rows and no parent foreign key when the owner determines it

Rules:

- keep embedded contracts owner-centered and schema-derived
- validate ids and ownership server-side even when the client already has the related rows loaded

### 4. Implement The Data Layer

Create `src/server/services/admin/<entity>.data.ts`.

This file should own raw Prisma operations and shape selection.

Expected responsibilities:

- define select objects for list and detail reads
- define relation-count selects when hard delete needs blocking rules
- export record types for list/detail/relation-count payloads
- expose focused read and write functions

Typical function set:

- `list<EntityPlural>()`
- `find<Entity>ById()`
- `get<Entity>Stats()`
- `create<Entity>()`
- `update<Entity>()`
- `softDelete<Entity>()`
- `hardDelete<Entity>()`
- `get<Entity>RelationCounts()` when needed

Rules:

- Keep raw Prisma here.
- Do not throw `TRPCError` here.
- Do not toast, log UI concerns, or perform router mapping here.
- Return records that can be parsed by the matching Zod schema without reshaping elsewhere.

If your entity supports hard delete blocking, collect all restrictive relation counts in this file so the service layer can build one clear message.

### 5. Implement The Service Layer

Create `src/server/services/admin/<entity>.service.ts`.

This is where the business rules live. The supplier service is the canonical model.

Expected responsibilities:

- parse records with the matching Zod detail or stats schema
- run mutations inside `database.$transaction()`
- write audit logs for create, update, soft delete, and hard delete
- block invalid actions such as editing deleted rows
- block hard delete when restrictive relations exist
- reconcile embedded related writes inside the owner transaction when the form manages related data inline
- keep the service independent from tRPC transport details

Example pattern:

```ts
export async function update(
	input: EntityUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findEntityById(tx, input.id);
		if (!beforeRecord) throwNotFound("Entidad");

		const before = parseDetail(beforeRecord);

		if (before.deleted) {
			throw new AdminCrudError(
				"CONFLICT",
				"No se puede editar una entidad eliminada",
			);
		}

		const updated = await updateEntity(tx, input);
		const after = parseDetail(updated);

		await writeAdminAuditLog(tx, {
			action: "entity.update",
			actor,
			entityType: "entity",
			entityId: String(after.id),
			before,
			after,
		});

		return after;
	});
}
```

For hard delete, follow the supplier pattern:

1. read relation counts first
2. decide whether the delete is blocked
3. throw `AdminCrudError("RELATION_BLOCKED", message)` if blocked
4. write an audit log with `metadata: { hardDelete: true }` when deletion succeeds

Important rules:

- Audit logging belongs in the same transaction as the mutation.
- Parse records before logging them so the audit payload matches the public contract.
- Service functions should return domain-shaped values, not raw Prisma responses.
- For embedded forms, validate selected related rows and child ownership before mutating, then reconcile children inside the owner transaction.
- Do not throw `TRPCError` from the service layer.

### 6. Implement The Router

Create `src/server/api/routers/admin/<entity>.router.ts`.

Router responsibilities:

- attach `.input()` and `.output()` schemas to every procedure
- call the service layer
- map `AdminCrudError` to `TRPCError`
- use the current auth context pattern already present in the repository

The supplier router is the exact pattern to copy. It currently:

- uses `publicProcedure`
- reads the actor through `getMockAuthenticatedUser(ctx)`
- maps `NOT_FOUND` to `TRPCError({ code: "NOT_FOUND" })`
- maps other `AdminCrudError` variants to `TRPCError({ code: "CONFLICT" })`

Example pattern:

```ts
function mapServiceError(error: unknown): never {
	if (error instanceof AdminCrudError) {
		throw new TRPCError({
			code: error.code === "NOT_FOUND" ? "NOT_FOUND" : "CONFLICT",
			message: error.message,
			cause: error,
		});
	}

	throw error;
}
```

Required procedures for the standard slice:

- `list`
- `getById`
- `getStats`
- `create`
- `update`
- `softDelete`
- `hardDelete`

After creating the router, mount it in `src/server/api/routers/admin.router.ts`.

Do not introduce a router factory unless requested.

### 7. Build Entity Mappers

If edit mode needs normalization or the database shape is not a perfect form default shape, add `src/features/admin/crud/<entity>/<entity>.mappers.ts`.

Typical mapper responsibilities:

- `default<Entity>FormValues`
- `<entity>DetailToFormValues()`

Use mappers when:

- nested objects need default empty strings or booleans
- nullable database fields need normalization for form inputs
- edit mode should reset to a parsed detail payload

Keep form mapping logic out of the page client when possible.

### 8. Build The Form Dialog

Create `src/features/admin/crud/<entity>/<entity>-form-dialog.tsx`.

The supplier form dialog is the canonical pattern. It should:

- use `useForm()` from React Hook Form
- use `zodResolver()` with the create schema
- use `CrudFormDialogShell`
- reset the form whenever the dialog opens in create mode
- reset from fetched detail data when edit mode opens
- render a skeleton while edit data is loading
- keep buttons disabled during submission or blocked states
- split large owner forms into reusable embedded fieldsets when related sections become non-trivial
- use `useFieldArray()` for owned collections and shared enum/select controls for discriminated related-row inputs
- use the shared `Field`, `FieldGroup`, `FieldLabel`, `FieldError`, `Input`, `Textarea`, `Switch`, and other existing UI components

Example pattern:

```ts
const form = useForm<EntityFormInput, unknown, EntityFormValues>({
	resolver: zodResolver(entityCreateInputSchema),
	defaultValues: defaultEntityFormValues,
});

useEffect(() => {
	if (!open) return;

	if (mode === "create") {
		form.reset(defaultEntityFormValues);
		return;
	}

	if (entity) {
		form.reset(entityDetailToFormValues(entity));
	}
}, [form, mode, open, entity]);
```

Rules:

- Always provide `defaultValues`.
- Keep the form bound to the Zod schema instead of hand-validating fields.
- Use `FieldError` to render validation errors consistently.
- Avoid modal-in-modal related-record creation unless it is truly necessary; prefer inline owner-form sections when the workflow belongs to the same submit.
- Do not leave stale edit values in the form when switching back to create mode.

### 9. Build The Table

Create `src/features/admin/crud/<entity>/<entity>-table.tsx`.

Follow the supplier table pattern:

- define columns once as `CrudColumn<EntityListItem>[]`
- define row actions as `CrudRowAction<EntityListItem>[]`
- render row actions with `CrudRowActions`
- render the table with `CrudTable`
- visually mute deleted rows with `getRowClassName`

Example pattern:

```ts
const entityColumns: CrudColumn<EntityListItem>[] = [
	{
		key: "name",
		header: "Nombre",
		cell: (entity) => <span className="font-medium">{entity.name}</span>,
	},
	{
		key: "status",
		header: "Estado",
		cell: (entity) => (
			<CrudStatusBadge active={entity.active} deleted={entity.deleted} />
		),
	},
];
```

Expected row actions for the standard slice:

- edit
- soft delete
- hard delete

Edit and soft delete are usually disabled when the row is already deleted. Hard delete remains available because the server decides whether the delete is truly allowed.

### 10. Build The Page-Level Client

Create `src/app/admin/crud-home/<entity-plural>/_components/<entity>-crud-client.tsx`.

This file coordinates the whole slice. It is the highest-value file to mirror after schemas and services already exist.

The established pattern includes:

- one closed modal state constant of type `CrudModalState<number>`
- local state for `includeDeleted`, status filter, search term, form modal, soft delete target, and hard delete target
- `api.admin.<entity>.list.useQuery({ includeDeleted })`
- `api.admin.<entity>.getStats.useQuery()`
- conditional `getById` query enabled only in edit mode
- separate create, update, soft delete, and hard delete mutations
- a shared invalidation helper that refreshes list, stats, and detail queries
- when embedded create/select is supported, invalidation for the related entity queries that feed the owner form controls too
- toasts for success and failure
- filtered data derived with `normalizeSearch`, `matchesSearch`, and `matchesCrudStatus`
- rendering of loading, error, empty, and table states
- two `CrudDeleteDialog` instances, one for soft delete and one for hard delete

Canonical modal state pattern:

```ts
const closedFormState: CrudModalState<number> = {
	open: false,
	mode: null,
	entityId: null,
};
```

Canonical detail query pattern:

```ts
const selectedEntityId =
	formState.open && formState.mode === "edit" ? formState.entityId : null;

const entityDetailQuery = api.admin.entity.getById.useQuery(
	{ id: selectedEntityId ?? 0 },
	{ enabled: selectedEntityId !== null },
);
```

Canonical invalidation pattern:

```ts
const invalidateEntityQueries = async () => {
	await Promise.all([
		utils.admin.entity.list.invalidate(),
		utils.admin.entity.getStats.invalidate(),
		utils.admin.entity.getById.invalidate(),
	]);
};
```

Rules:

- Keep the page client responsible for orchestration, not field-level rendering.
- Always invalidate list and stats after mutations.
- Invalidate `getById` too, because edit mode can stay open across updates.
- If the owner mutation can create related rows inline, invalidate the owner slice and the related entity queries used by embedded selects or collection summaries.
- Close dialog state on successful create and update.
- Clear delete targets on successful delete and on dialog close.

### 11. Wire Delete Dialogs Correctly

Use `CrudDeleteDialog` for both delete modes.

Soft delete pattern:

- no typed confirmation by default
- description should explain that the record becomes logically deleted and inactive
- success toast should indicate paper-bin or logical delete behavior

Hard delete pattern:

- provide `confirmationValue` when the action is destructive enough to need typed confirmation
- set `confirmationLabel` to tell the operator exactly what to type
- explain that the server may still block the delete because of related data

Example pattern:

```tsx
<CrudDeleteDialog
	confirmLabel="Eliminar definitivamente"
	confirmationLabel={`Escribí "${target.name}" para confirmar`}
	confirmationValue={target.name}
	description="Esta acción intenta borrar el registro de la base de datos. Si tiene relaciones restrictivas, el servidor la va a bloquear."
	isPending={hardDeleteMutation.isPending}
	onConfirm={() => hardDeleteMutation.mutate({ id: target.id })}
	onOpenChange={(open) => {
		if (!open) setHardDeleteTarget(null);
	}}
	open={Boolean(target)}
	title="Eliminación definitiva"
/>
```

Do not skip the typed confirmation for the hard delete flow unless the user explicitly asks for a lighter confirmation model.

### 12. Create The Route Entry Point

Create `src/app/admin/crud-home/<entity-plural>/page.tsx` if it does not already exist.

Keep the page file thin. It should usually render the client component and not duplicate the page logic.

Pattern:

```tsx
import { EntityCrudClient } from "./_components/entity-crud-client";

export default function EntityCrudPage() {
	return <EntityCrudClient />;
}
```

### 13. Update Router Mounting

After the entity router exists, mount it in `src/server/api/routers/admin.router.ts`.

The new router should sit beside existing entity routers and preserve naming consistency.

Example pattern:

```ts
export const adminRouter = createTRPCRouter({
	supplier: supplierRouter,
	entity: entityRouter,
});
```

## Examples To Reuse

These examples match the current repository and should be preferred over inventing a new abstraction.

### Example: Service-Level Relation Blocking

When hard delete can break historical or commercial integrity, block it in the service layer.

```ts
const hasRestrictiveRelations =
	record._count.productSupplierTerms > 0 ||
	record._count.lots > 0 ||
	record._count.supplierOrders > 0;

if (hasRestrictiveRelations) {
	throw new AdminCrudError(
		"RELATION_BLOCKED",
		buildRelationBlockMessage(record),
	);
}
```

Why this matters:

- the rule belongs to the business layer
- the UI may request a hard delete, but the server is the final authority
- relation-block messages should be specific enough for operators to understand the failure

### Example: Form Reset Rules

When the same dialog supports create and edit, reset behavior matters.

```ts
useEffect(() => {
	if (!open) return;

	if (mode === "create") {
		form.reset(defaultEntityFormValues);
		return;
	}

	if (entity) {
		form.reset(entityDetailToFormValues(entity));
	}
}, [form, mode, open, entity]);
```

Why this matters:

- prevents stale edit data from leaking into create mode
- keeps edit mode synchronized with the fetched detail record
- avoids hard-to-debug form state drift

### Example: Row Actions

Row actions should be declarative and driven by `CrudRowAction<TItem>[]`.

```ts
const actions: CrudRowAction<EntityListItem>[] = [
	{
		label: "Editar",
		icon: PencilIcon,
		onSelect: onEdit,
		disabled: (entity) => entity.deleted,
	},
	{
		label: "Enviar a papelera",
		icon: ArchiveXIcon,
		onSelect: onSoftDelete,
		disabled: (entity) => entity.deleted,
	},
	{
		label: "Eliminar definitivamente",
		icon: Trash2Icon,
		onSelect: onHardDelete,
		destructive: true,
	},
];
```

Why this matters:

- it keeps action rendering consistent across entities
- it allows disabled logic to stay close to the action definition
- it aligns with the shared dropdown component already in use

### Example: Query Invalidation After Mutation

Invalidate the full slice that changed.

```ts
const createMutation = api.admin.entity.create.useMutation({
	onSuccess: async () => {
		toast.success("Entidad creada");
		setFormState(closedFormState);
		await invalidateEntityQueries();
	},
	onError: (error) => {
		toast.error(error.message || "No se pudo crear la entidad");
	},
});
```

Do not invalidate only the list if stats or detail can also go stale.

## Common Pitfalls

These mistakes are easy to make and usually lead to inconsistent CRUD slices.

### 1. Starting From The Page Instead Of The Contract

Do not start by building the page or table first.

Start with schemas and shared types. The rest of the slice depends on them.

### 2. Re-Declaring Types By Hand

Do not define parallel interfaces for create, update, detail, or form payloads when Zod already defines the shape.

Infer from the schema instead.

### 3. Throwing `TRPCError` In The Service Layer

The service layer should throw `AdminCrudError` and remain reusable outside tRPC.

Map to `TRPCError` only in the router.

### 4. Forgetting Audit Logs

Create, update, soft delete, and hard delete should all write audit entries.

If a mutation changes persisted admin data and no audit event is recorded, the slice is incomplete.

### 5. Logging Outside The Transaction

Keep the audit write in the same `database.$transaction()` block as the mutation. Otherwise the mutation and audit trail can diverge.

### 6. Forgetting To Block Invalid Edits

If an entity can be logically deleted, editing that deleted row should usually be blocked in the service layer.

The supplier implementation does this explicitly.

### 7. Collapsing Soft Delete And Hard Delete Into One Flow

These are different operations with different user messages and different service rules.

Keep them separate in UI, router, and service code.

### 8. Skipping Relation Checks For Hard Delete

If the entity has restrictive relations, check them before hard delete and return a clear blocking message.

Do not rely on a raw database error as the user-facing explanation.

### 9. Not Resetting The Form Between Modes

Without reset logic, create mode often opens with stale edit values.

Always reset when the dialog opens and when the mode changes.

### 10. Fetching Edit Detail Unconditionally

The detail query should be enabled only when edit mode is active and an entity id exists.

Otherwise you generate pointless requests and awkward fallback values.

### 11. Forgetting To Invalidate Stats

Create, update, soft delete, and hard delete can all affect the stats cards.

Invalidate `list`, `getStats`, and `getById` together.

### 12. Rebuilding Shared CRUD Primitives

Do not create a new page shell, table shell, status badge, or delete dialog when an existing shared primitive already fits.

Extend only when the new behavior cannot be expressed by the existing component.

### 13. Introducing New Architecture During Routine CRUD Work

Do not add:

- a generic CRUD service factory
- a router factory
- pagination infrastructure
- i18n abstractions
- auth rewrites
- server-side search infrastructure

unless the user explicitly asks for that broader change.

This repository does not use those abstractions yet in the admin CRUD slice.

### 14. Drifting From Repository Copy Patterns

Current admin CRUD copy is Spanish and aligned with operational language.

Do not silently switch new CRUD screens to English or to a different tone.

### 15. Chaining Embedded Writes From The Client

Do not create a related row with one client mutation and then submit the owner with a second mutation just because the form is embedded.

Submit one owner payload and let the owner service transaction handle the related write and assignment.

### 16. Accepting Child Ids Without Ownership Checks

If an embedded collection submits child `id` values, verify server-side that each row belongs to the current owner before updating it.

Never trust the client-side array shape as proof of ownership.

### 17. Hard-Deleting Removed Embedded Children

When an owner form removes a dependent child from an embedded collection, do not default to hard delete.

Prefer the repository's soft-delete behavior unless the user explicitly asks for destructive removal.

### 18. Editing Shared Related Records Through The Wrong Form

If the embedded relation points at a shared entity, do not silently turn the owner form into an editor for that shared row.

Selecting an existing `Brand` from `Product` is fine. Editing that shared `Brand` inline is a separate feature and should only happen when explicitly requested.

## Implementation Checklist For A New Entity

Before you finish, verify that you created or updated all relevant pieces.

- schema file exists under `src/schemas/admin`
- shared types exist under `src/shared/common/admin-crud`
- data layer exists under `src/server/services/admin`
- service layer exists under `src/server/services/admin`
- router file exists under `src/server/api/routers/admin`
- router is mounted in `src/server/api/routers/admin.router.ts`
- page route exists under `src/app/admin/crud-home/<entity-plural>`
- page-level client exists under `_components`
- form dialog exists under `src/features/admin/crud/<entity>`
- table exists under `src/features/admin/crud/<entity>`
- mappers exist when form defaults or edit normalization need them
- embedded owner/child or select/create schemas exist when the form manages related data inline
- list, stats, detail, create, update, soft delete, and hard delete are wired end to end
- toast messages and UI copy are in Spanish
- deleted rows are visually distinguishable
- hard delete uses a clear destructive confirmation flow
- mutations invalidate list, stats, and detail queries
- owner detail queries include embedded rows needed to reset the form when inline collections are edited
- owner service reconciles embedded writes transactionally and validates selected related rows or child ownership server-side
- related entity queries used by embedded selects or inline creation are invalidated when the owner mutation changes them
- service mutations write audit logs
- audit logs reflect owner mutations plus embedded creates, updates, and soft deletes when they happen
- relation-blocking hard delete behavior is implemented where required

## Validation And Verification

After implementing a new slice, validate in this order:

1. Compare your new entity against the supplier flow and make sure every corresponding layer exists.
2. Run formatting and lint checks as appropriate for the changed files.
3. If TypeScript files changed, prefer `pnpm exec tsgo --noEmit` over `tsc --noEmit` in this workspace.
4. If broader checks are needed, use `pnpm check`.
5. Smoke-test create, edit, soft delete, hard delete, and filter behavior.
6. Confirm hard delete blocking behavior if the entity has related records.
7. Confirm that reopening the form in create mode does not preserve the previous edit payload.

For deletion behavior, explicitly test both cases:

- a record that can be hard deleted
- a record that should be blocked because of restrictive relations

## Execution Strategy For Agents

When asked to add a new admin CRUD handler, do not wander across the repository.

Use this local route:

1. inspect the supplier schema, service, router, page client, form dialog, and table
2. create the new entity schema and shared types, plus embedded contracts when the owner form writes related data
3. create the data and service layer
4. create the router and mount it
5. create entity form, table, mappers, and reusable embedded fieldsets when needed
6. create the page client and route entrypoint
7. wire delete dialogs, filters, and stats
8. run focused validation

Prefer copying the structure of the supplier flow and changing entity-specific details over inventing a new pattern.

## What Good Output Looks Like

A good admin CRUD implementation in this repository should feel boring in the best way:

- file placement matches the existing admin CRUD layout
- transport, business, data, and UI responsibilities are separated cleanly
- the page client is easy to follow
- create and edit share the same dialog without stale state
- delete flows are explicit and safe
- every mutation has an audit trail
- the new slice looks like it belongs next to supplier

If your output requires a long explanation for why it deviates from supplier, it is probably drifting from the established pattern.
