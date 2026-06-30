"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import type * as React from "react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
	return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
	...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
	return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({
	...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
	return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({
	...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
	return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
	className,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
	return (
		<SheetPrimitive.Overlay
			className={cn(
				"data-open:fade-in-0 data-closed:fade-out-0 fixed inset-0 isolate z-50 bg-black/30 duration-200 data-closed:animate-out data-open:animate-in supports-backdrop-filter:backdrop-blur-sm",
				className,
			)}
			data-slot="sheet-overlay"
			{...props}
		/>
	);
}

const sheetContentVariants = cva(
	"fixed z-50 flex flex-col gap-4 bg-popover text-popover-foreground shadow-xl outline-none ring-1 ring-foreground/5 duration-300 data-closed:animate-out data-open:animate-in dark:ring-foreground/10",
	{
		variants: {
			side: {
				right:
					"data-open:slide-in-from-right data-closed:slide-out-to-right inset-y-0 right-0 h-full w-full max-w-md rounded-l-4xl",
				left: "data-open:slide-in-from-left data-closed:slide-out-to-left inset-y-0 left-0 h-full w-full max-w-md rounded-r-4xl",
				top: "data-open:slide-in-from-top data-closed:slide-out-to-top inset-x-0 top-0 max-h-[85vh] rounded-b-4xl",
				bottom:
					"data-open:slide-in-from-bottom data-closed:slide-out-to-bottom inset-x-0 bottom-0 max-h-[85vh] rounded-t-4xl",
			},
		},
		defaultVariants: {
			side: "right",
		},
	},
);

function SheetContent({
	className,
	children,
	side = "right",
	showCloseButton = true,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Content> &
	VariantProps<typeof sheetContentVariants> & {
		showCloseButton?: boolean;
	}) {
	return (
		<SheetPortal>
			<SheetOverlay />
			<SheetPrimitive.Content
				className={cn(sheetContentVariants({ side }), className)}
				data-slot="sheet-content"
				{...props}
			>
				{children}
				{showCloseButton && (
					<SheetPrimitive.Close asChild data-slot="sheet-close">
						<Button
							className="absolute top-4 right-4 bg-secondary"
							size="icon-sm"
							variant="ghost"
						>
							<XIcon />
							<span className="sr-only">Cerrar</span>
						</Button>
					</SheetPrimitive.Close>
				)}
			</SheetPrimitive.Content>
		</SheetPortal>
	);
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("flex flex-col gap-1.5 px-6 pt-6", className)}
			data-slot="sheet-header"
			{...props}
		/>
	);
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("mt-auto flex flex-col gap-2 px-6 pb-6", className)}
			data-slot="sheet-footer"
			{...props}
		/>
	);
}

function SheetTitle({
	className,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
	return (
		<SheetPrimitive.Title
			className={cn(
				"font-heading font-medium text-base leading-none",
				className,
			)}
			data-slot="sheet-title"
			{...props}
		/>
	);
}

function SheetDescription({
	className,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
	return (
		<SheetPrimitive.Description
			className={cn("text-muted-foreground text-sm", className)}
			data-slot="sheet-description"
			{...props}
		/>
	);
}

export {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetOverlay,
	SheetPortal,
	SheetTitle,
	SheetTrigger,
};
