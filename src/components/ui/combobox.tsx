"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useState } from "react";

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "~/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";

type ComboboxOption = {
	value: string;
	label: string;
	disabled?: boolean;
	keywords?: string[];
};

function Combobox({
	options,
	value,
	onChange,
	placeholder = "Seleccionar",
	searchPlaceholder = "Buscar...",
	emptyText = "Sin resultados",
	disabled,
	invalid,
	id,
	className,
}: {
	options: ComboboxOption[];
	value: string | null;
	onChange: (value: string) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyText?: string;
	disabled?: boolean;
	invalid?: boolean;
	id?: string;
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const selected = value
		? options.find((option) => option.value === value)
		: undefined;

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<button
					aria-expanded={open}
					aria-invalid={invalid}
					className={cn(
						"flex h-9 w-full items-center justify-between gap-1.5 rounded-3xl border border-transparent bg-input/50 px-3 py-2 text-left text-sm outline-none transition-[color,box-shadow,background-color] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
						className,
					)}
					disabled={disabled}
					id={id}
					role="combobox"
					type="button"
				>
					<span
						className={cn(
							"line-clamp-1",
							selected ? "text-foreground" : "text-muted-foreground",
						)}
					>
						{selected ? selected.label : placeholder}
					</span>
					<ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-(--radix-popover-trigger-width) p-0"
			>
				<Command>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList>
						<CommandEmpty>{emptyText}</CommandEmpty>
						<CommandGroup>
							{options.map((option) => (
								<CommandItem
									disabled={option.disabled}
									key={option.value}
									keywords={[option.label, ...(option.keywords ?? [])]}
									onSelect={() => {
										onChange(option.value);
										setOpen(false);
									}}
									value={option.value}
								>
									<CheckIcon
										className={cn(
											option.value === value ? "opacity-100" : "opacity-0",
										)}
									/>
									<span className="line-clamp-1">{option.label}</span>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export type { ComboboxOption };
export { Combobox };
