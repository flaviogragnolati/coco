"use client";

import { Command as CommandPrimitive } from "cmdk";
import { SearchIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "~/lib/utils";

function Command({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive>) {
	return (
		<CommandPrimitive
			className={cn(
				"flex h-full w-full flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground",
				className,
			)}
			data-slot="command"
			{...props}
		/>
	);
}

function CommandInput({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
	return (
		<div
			className="flex h-9 items-center gap-2 border-border border-b px-3"
			data-slot="command-input-wrapper"
		>
			<SearchIcon className="size-4 shrink-0 text-muted-foreground" />
			<CommandPrimitive.Input
				className={cn(
					"flex h-9 w-full bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
					className,
				)}
				data-slot="command-input"
				{...props}
			/>
		</div>
	);
}

function CommandList({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
	return (
		<CommandPrimitive.List
			className={cn(
				"max-h-64 scroll-py-1 overflow-y-auto overflow-x-hidden p-1.5",
				className,
			)}
			data-slot="command-list"
			{...props}
		/>
	);
}

function CommandEmpty({
	...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
	return (
		<CommandPrimitive.Empty
			className="py-6 text-center text-muted-foreground text-sm"
			data-slot="command-empty"
			{...props}
		/>
	);
}

function CommandGroup({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
	return (
		<CommandPrimitive.Group
			className={cn(
				"overflow-hidden text-foreground **:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-muted-foreground **:[[cmdk-group-heading]]:text-xs",
				className,
			)}
			data-slot="command-group"
			{...props}
		/>
	);
}

function CommandSeparator({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
	return (
		<CommandPrimitive.Separator
			className={cn("-mx-1.5 my-1.5 h-px bg-border", className)}
			data-slot="command-separator"
			{...props}
		/>
	);
}

function CommandItem({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
	return (
		<CommandPrimitive.Item
			className={cn(
				"relative flex w-full cursor-default select-none items-center gap-2.5 rounded-2xl px-3 py-2 font-medium text-sm outline-hidden data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			data-slot="command-item"
			{...props}
		/>
	);
}

export {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
};
