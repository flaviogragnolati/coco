"use client";

import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";

/** The terms text behind the checkbox link; "Aceptar" ticks the box. */
export function TermsDialog({
	open,
	onOpenChange,
	termsText,
	onAccept,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	termsText: string;
	onAccept: () => void;
}) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Términos del pedido</DialogTitle>
					<DialogDescription>
						Lo que aceptás al confirmar. Tu pedido guarda esta versión.
					</DialogDescription>
				</DialogHeader>
				<div className="max-h-[55vh] overflow-y-auto whitespace-pre-line rounded-2xl bg-muted/50 p-4 text-sm/relaxed">
					{termsText}
				</div>
				<DialogFooter>
					<Button
						onClick={() => onOpenChange(false)}
						type="button"
						variant="outline"
					>
						Cerrar
					</Button>
					<Button
						onClick={() => {
							onAccept();
							onOpenChange(false);
						}}
						type="button"
					>
						Aceptar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
