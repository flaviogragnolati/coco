"use client";

import { RotateCcwIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";
import { describeRepeatOutcome } from "~/features/cart/repeat-order.messages";
import { cn } from "~/lib/utils";
import type {
	RepeatOrderPreview,
	RepeatOrderPreviewLine,
} from "~/shared/common/cart.types";
import { formatCurrency } from "~/shared/common/commerce.helpers";
import { useCartStore } from "~/store/cart-store";
import { api } from "~/trpc/react";

type WaitingOrder = Extract<
	RepeatOrderPreview,
	{ state: "blocked" }
>["waitingOrder"];

function availableProductIds(lines: RepeatOrderPreviewLine[]) {
	return new Set(
		lines.flatMap((line) =>
			line.available && line.productId !== null ? [line.productId] : [],
		),
	);
}

function WaitingOrderNotice({ order }: { order: WaitingOrder }) {
	const reference = order.currency
		? `${order.code}, ${formatCurrency(order.totalAmount, order.currency)}`
		: order.code;

	return (
		<div className="flex flex-col gap-3">
			<Alert>
				<AlertDescription>
					Tenés un pedido esperando el pago ({reference}). Pagalo o volvé a
					editarlo antes de repetir otro.
				</AlertDescription>
			</Alert>
			<Button asChild variant="outline">
				<Link href={`/my-orders/${order.id}`}>Ver pedido pendiente</Link>
			</Button>
		</div>
	);
}

function RepeatLineRow({
	id,
	line,
	checked,
	onCheckedChange,
}: {
	id: string;
	line: RepeatOrderPreviewLine;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}) {
	return (
		<div
			className={cn(
				"flex items-start justify-between gap-3 rounded-3xl border p-3",
				!line.available && "text-muted-foreground",
			)}
		>
			<div className="flex min-w-0 items-start gap-3">
				<Checkbox
					checked={checked}
					className="mt-0.5"
					disabled={!line.available}
					id={id}
					onCheckedChange={(value) => onCheckedChange(value === true)}
				/>
				<div className="flex min-w-0 flex-col gap-1">
					<label className="font-medium text-sm" htmlFor={id}>
						{line.name}
					</label>
					<span className="text-muted-foreground text-xs">
						{line.quantityLabel}
					</span>
				</div>
			</div>
			<span
				className={cn(
					"shrink-0 text-right",
					line.available ? "font-heading font-semibold" : "text-xs",
				)}
			>
				{line.available && line.lineTotal !== null && line.currency
					? formatCurrency(line.lineTotal, line.currency)
					: "Ya no disponible"}
			</span>
		</div>
	);
}

/**
 * Puts the products of an earlier order back into "Tu pedido" at today's
 * prices, then opens it for the customer to review and confirm.
 */
export function RepeatOrderDialog({
	orderId,
	userId,
}: {
	orderId: number;
	userId: string;
}) {
	const router = useRouter();
	const utils = api.useUtils();
	const [open, setOpen] = useState(false);
	// Null means the default selection: every available line checked.
	const [selection, setSelection] = useState<Set<number> | null>(null);

	const preview = api.orders.repeatPreview.useQuery(
		{ orderId },
		{ enabled: open },
	);
	const repeat = api.orders.repeat.useMutation({
		onSuccess(output) {
			useCartStore.getState().replaceCart(output.cart, userId);
			void utils.cart.getCurrent.invalidate();

			const messages = describeRepeatOutcome(output.lines);
			if (messages.success) toast.success(messages.success);
			for (const message of messages.info) toast.info(message);
			for (const message of messages.warning) toast.warning(message);

			setOpen(false);
			router.push("/cart");
		},
		onError(error) {
			toast.error(error.message);
			if (error.data?.code === "PRECONDITION_FAILED") void preview.refetch();
		},
	});

	const lines = preview.data?.state === "ready" ? preview.data.lines : [];
	const available = availableProductIds(lines);
	const selected = selection ?? available;
	const chosen = Array.from(selected).filter((id) => available.has(id));

	const toggle = (productId: number, checked: boolean) => {
		const next = new Set(selected);
		if (checked) next.add(productId);
		else next.delete(productId);
		setSelection(next);
	};

	const handleOpenChange = (next: boolean) => {
		setOpen(next);
		if (!next) setSelection(null);
	};

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogTrigger asChild>
				<Button variant="outline">
					<RotateCcwIcon data-icon="inline-start" />
					Repetir pedido
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Repetir pedido</DialogTitle>
					<DialogDescription>
						Usamos los precios y la disponibilidad de hoy. Lo que elijas se suma
						a tu pedido.
					</DialogDescription>
				</DialogHeader>

				{preview.isPending ? (
					<div className="flex flex-col gap-3">
						<Skeleton className="h-14 w-full rounded-3xl" />
						<Skeleton className="h-14 w-full rounded-3xl" />
						<Skeleton className="h-14 w-full rounded-3xl" />
					</div>
				) : preview.isError ? (
					<Alert variant="destructive">
						<AlertDescription>{preview.error.message}</AlertDescription>
					</Alert>
				) : preview.data.state === "blocked" ? (
					<WaitingOrderNotice order={preview.data.waitingOrder} />
				) : (
					<div className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto">
						{available.size === 0 ? (
							<p className="text-muted-foreground text-sm">
								Ninguno de estos productos está disponible hoy.
							</p>
						) : null}
						{lines.map((line, index) => (
							<RepeatLineRow
								checked={
									line.productId !== null && selected.has(line.productId)
								}
								id={`repeat-line-${index}`}
								key={line.productId ?? `unknown-${index}`}
								line={line}
								onCheckedChange={(checked) => {
									if (line.productId !== null) toggle(line.productId, checked);
								}}
							/>
						))}
					</div>
				)}

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Cancelar</Button>
					</DialogClose>
					{preview.data?.state === "blocked" ? null : (
						<Button
							disabled={chosen.length === 0 || repeat.isPending}
							onClick={() => repeat.mutate({ orderId, productIds: chosen })}
						>
							Sumar a mi pedido
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
