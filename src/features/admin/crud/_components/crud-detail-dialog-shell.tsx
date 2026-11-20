"use client";

import type { ReactNode } from "react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import {
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { cn } from "~/lib/utils";

/**
 * Frame shared by the read-oriented detail dialogs: what kind of record it is
 * (`eyebrow`), which one (`title`), its state (`status`) and then the body.
 * Loading and error are handled here so a dialog only describes its content.
 */
export function CrudDetailDialogShell({
	open,
	onOpenChange,
	eyebrow,
	title,
	description,
	status,
	isLoading,
	errorMessage,
	children,
	footer,
	contentClassName,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Record kind, e.g. "Lote". */
	eyebrow: string;
	title: ReactNode;
	description?: ReactNode;
	/** Status chips shown next to the title. */
	status?: ReactNode;
	isLoading?: boolean;
	errorMessage?: string;
	/** Rendered only once loading finished without an error. */
	children: ReactNode;
	footer?: ReactNode;
	/** Merged onto the default width; the height and scroll classes always win. */
	contentClassName?: string;
}) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				className={cn(
					"sm:max-w-5xl",
					contentClassName,
					"max-h-[calc(100vh-2rem)] overflow-y-auto",
				)}
			>
				<DialogHeader className="gap-2 pr-10">
					<span className="font-semibold text-highlight text-xs uppercase tracking-wide">
						{eyebrow}
					</span>
					<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
						<DialogTitle className="font-semibold text-xl leading-tight">
							{title}
						</DialogTitle>
						{status}
					</div>
					{description ? (
						<DialogDescription>{description}</DialogDescription>
					) : null}
				</DialogHeader>

				{isLoading ? <CrudLoadingState rows={4} /> : null}
				{!isLoading && errorMessage ? (
					<CrudErrorState message={errorMessage} />
				) : null}
				{!isLoading && !errorMessage ? children : null}

				{footer ? (
					<DialogFooter className="flex-wrap border-t pt-4">
						{footer}
					</DialogFooter>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
