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
import { cn } from "~/lib/utils";

export function CrudFormDialogShell({
	open,
	onOpenChange,
	title,
	description,
	children,
	footer,
	contentClassName,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	children: ReactNode;
	footer: ReactNode;
	/** Merged onto the default width; the height and scroll classes always win. */
	contentClassName?: string;
}) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				className={cn(
					"sm:max-w-3xl",
					contentClassName,
					"max-h-[calc(100vh-2rem)] overflow-y-auto",
				)}
			>
				<DialogHeader className="pr-10">
					<DialogTitle className="font-semibold text-lg leading-tight">
						{title}
					</DialogTitle>
					{description ? (
						<DialogDescription>{description}</DialogDescription>
					) : null}
				</DialogHeader>
				{children}
				<DialogFooter className="border-t pt-4">{footer}</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
