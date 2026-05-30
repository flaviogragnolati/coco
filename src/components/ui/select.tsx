"use client";

import { ChevronDownIcon } from "lucide-react";
import * as React from "react";

import { cn } from "~/lib/utils";

const Select = React.forwardRef<
	HTMLSelectElement,
	React.ComponentProps<"select">
>(({ className, children, ...props }, ref) => {
	return (
		<div className="relative w-full">
			<select
				className={cn(
					"h-8 w-full appearance-none rounded-none border border-input bg-transparent px-2.5 py-1 pr-8 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 md:text-xs dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 dark:disabled:bg-input/80",
					className,
				)}
				data-slot="select"
				ref={ref}
				{...props}
			>
				{children}
			</select>
			<ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
		</div>
	);
});

Select.displayName = "Select";

export { Select };
