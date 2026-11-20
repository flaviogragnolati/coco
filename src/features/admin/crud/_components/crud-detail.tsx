import { ChevronDownIcon } from "lucide-react";
import type { ReactNode } from "react";

import { DiagnosticDetailChip } from "~/features/admin/crud/_components/diagnostic-detail-chip";
import { cn } from "~/lib/utils";
import type { OperationalDiagnosticSeverity } from "~/shared/common/admin-crud/operational-diagnostic.types";
import { formatDateTimeShort } from "~/shared/common/date.helpers";

/**
 * Building blocks of the admin detail views (dialogs and the cart traceability
 * page). They exist so every detail reads the same way: titled sections,
 * label-over-value fields, number tiles, and one treatment for empty lists,
 * events and diagnostics.
 */

export function DetailSectionTitle({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<h3
			className={cn(
				"font-semibold text-muted-foreground text-xs uppercase tracking-wide",
				className,
			)}
		>
			{children}
		</h3>
	);
}

export function DetailSection({
	title,
	description,
	actions,
	children,
	className,
}: {
	title?: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section
			className={cn("flex flex-col gap-3 rounded-2xl border p-4", className)}
		>
			{title || description || actions ? (
				<div className="flex flex-wrap items-start justify-between gap-2">
					<div className="flex flex-col gap-1">
						{title ? <DetailSectionTitle>{title}</DetailSectionTitle> : null}
						{description ? (
							<p className="text-muted-foreground text-xs/relaxed">
								{description}
							</p>
						) : null}
					</div>
					{actions}
				</div>
			) : null}
			{children}
		</section>
	);
}

const gridColumnsClass = {
	2: "sm:grid-cols-2",
	3: "sm:grid-cols-2 md:grid-cols-3",
	4: "sm:grid-cols-2 md:grid-cols-4",
	5: "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
} as const;

export type DetailColumns = keyof typeof gridColumnsClass;

/** Definition list laid out as a responsive grid of `DetailField`s. */
export function DetailGrid({
	columns = 4,
	children,
	className,
}: {
	columns?: DetailColumns;
	children: ReactNode;
	className?: string;
}) {
	return (
		<dl
			className={cn(
				"grid gap-x-4 gap-y-3",
				gridColumnsClass[columns],
				className,
			)}
		>
			{children}
		</dl>
	);
}

/** Label over value. `hint` is the secondary line under the value. */
export function DetailField({
	label,
	hint,
	children,
	className,
}: {
	label: ReactNode;
	hint?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("flex min-w-0 flex-col items-start gap-1", className)}>
			<dt className="text-muted-foreground text-xs">{label}</dt>
			<dd className="min-w-0 max-w-full break-words font-medium text-sm">
				{children}
			</dd>
			{hint ? (
				<dd className="min-w-0 max-w-full break-words text-muted-foreground text-xs">
					{hint}
				</dd>
			) : null}
		</div>
	);
}

/** Created/updated pair, the field every detail view closes its summary with. */
export function DetailDatesField({
	createdAt,
	updatedAt,
	feminine,
}: {
	createdAt: Date | string;
	updatedAt: Date | string;
	/** "Creada / Actualizada" for feminine nouns (orden, operación). */
	feminine?: boolean;
}) {
	return (
		<DetailField
			hint={`${feminine ? "Actualizada" : "Actualizado"} ${formatDateTimeShort(new Date(updatedAt))}`}
			label="Fechas"
		>
			<span className="font-normal">
				{feminine ? "Creada" : "Creado"}{" "}
				{formatDateTimeShort(new Date(createdAt))}
			</span>
		</DetailField>
	);
}

export type DetailMetric = {
	label: string;
	value: ReactNode;
	hint?: ReactNode;
	/** Draws attention to a number that needs action (pending, unassigned). */
	tone?: "default" | "warning";
};

/** Row of number tiles: the quantities a reader scans before anything else. */
export function DetailMetrics({
	items,
	columns = 4,
	className,
}: {
	items: DetailMetric[];
	columns?: DetailColumns;
	className?: string;
}) {
	return (
		<dl className={cn("grid gap-2", gridColumnsClass[columns], className)}>
			{items.map((item) => (
				<div
					className={cn(
						"flex flex-col gap-0.5 rounded-xl bg-muted/60 px-3 py-2.5",
						item.tone === "warning" &&
							"bg-warning/10 text-warning-foreground dark:bg-warning/20 dark:text-foreground",
					)}
					key={item.label}
				>
					<dt className="text-muted-foreground text-xs">{item.label}</dt>
					<dd className="font-heading font-semibold text-xl tabular-nums leading-tight">
						{item.value}
					</dd>
					{item.hint ? (
						<dd className="text-muted-foreground text-xs">{item.hint}</dd>
					) : null}
				</div>
			))}
		</dl>
	);
}

/** Quiet placeholder for an empty list inside a detail view. */
export function DetailEmpty({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<p
			className={cn(
				"rounded-xl border border-dashed px-3 py-4 text-center text-muted-foreground text-xs",
				className,
			)}
		>
			{children}
		</p>
	);
}

/** One entry of a list of records (a lot line, a package, a shipment). */
export function DetailItem({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("rounded-xl border bg-card p-3", className)}>
			{children}
		</div>
	);
}

/** Collapsed block for technical payloads nobody needs on a first read. */
export function DetailDisclosure({
	title,
	children,
	className,
}: {
	title: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<details className={cn("group rounded-2xl border p-4", className)}>
			<summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide [&::-webkit-details-marker]:hidden">
				{title}
				<ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" />
			</summary>
			<div className="mt-3">{children}</div>
		</details>
	);
}

export type DetailEvent = {
	id: number | string;
	createdAt: Date | string;
	label: string;
	cartItemCode?: string | null;
};

/** Compact vertical timeline of the latest tracking events of a record. */
export function DetailEventList({
	events,
	emptyLabel = "Sin eventos",
}: {
	events: DetailEvent[];
	emptyLabel?: string;
}) {
	if (events.length === 0) return <DetailEmpty>{emptyLabel}</DetailEmpty>;

	return (
		<ol className="flex flex-col">
			{events.map((event, index) => (
				<li className="relative flex gap-3 pb-3 last:pb-0" key={event.id}>
					{index < events.length - 1 ? (
						<span
							aria-hidden="true"
							className="absolute top-3 bottom-0 left-[3px] w-px bg-border"
						/>
					) : null}
					<span
						aria-hidden="true"
						className="relative mt-1.5 size-[7px] shrink-0 rounded-full bg-primary"
					/>
					<div className="flex min-w-0 flex-col gap-0.5">
						<span className="font-medium text-sm leading-snug">
							{event.label}
						</span>
						<span className="text-muted-foreground text-xs">
							{formatDateTimeShort(new Date(event.createdAt))}
							{event.cartItemCode ? (
								<>
									{" · "}
									<span className="font-mono">{event.cartItemCode}</span>
								</>
							) : null}
						</span>
					</div>
				</li>
			))}
		</ol>
	);
}

export type DetailDiagnostic = {
	code: string;
	severity: OperationalDiagnosticSeverity;
	message: string;
};

export function DetailDiagnosticList({
	diagnostics,
	emptyLabel = "Sin diagnósticos",
}: {
	diagnostics: DetailDiagnostic[];
	emptyLabel?: string;
}) {
	if (diagnostics.length === 0) return <DetailEmpty>{emptyLabel}</DetailEmpty>;

	return (
		<ul className="flex flex-col gap-2">
			{diagnostics.map((diagnostic) => (
				<li
					className={cn(
						"flex flex-col items-start gap-1.5 rounded-xl border-l-2 bg-muted/40 px-3 py-2",
						diagnostic.severity === "critical"
							? "border-l-destructive"
							: "border-l-warning",
					)}
					key={diagnostic.code}
				>
					<DiagnosticDetailChip
						code={diagnostic.code}
						severity={diagnostic.severity}
					/>
					<p className="text-xs/relaxed">{diagnostic.message}</p>
				</li>
			))}
		</ul>
	);
}
