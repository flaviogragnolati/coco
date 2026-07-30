"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import {
	type AdminQuickActionId,
	adminQuickActions,
} from "./admin-quick-actions";

// The glossary dataset is ~180 records; loading it lazily keeps it out of the
// bundle of every admin page. `ssr: false` is only legal in a client component.
const GlossaryDialog = dynamic(
	() =>
		import("~/features/admin/glossary/glossary-dialog").then(
			(module) => module.GlossaryDialog,
		),
	{ ssr: false },
);

const shortcutLabel = "⌘K / Ctrl+K";

// A single registered action opens directly; two or more open a popover list.
const soleAction =
	adminQuickActions.length === 1 ? adminQuickActions[0] : undefined;

function isTypingTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) return false;
	return (
		target.isContentEditable ||
		["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
	);
}

export function AdminFab() {
	const [activeAction, setActiveAction] = useState<AdminQuickActionId | null>(
		null,
	);
	const [listOpen, setListOpen] = useState(false);
	// Keeps the lazy chunk out of the page until the admin asks for it once, and
	// keeps it mounted afterwards so reopening is instant.
	const [glossaryRequested, setGlossaryRequested] = useState(false);

	const openAction = useCallback((id: AdminQuickActionId) => {
		if (id === "glossary") setGlossaryRequested(true);
		setActiveAction(id);
		setListOpen(false);
	}, []);

	const trigger = useCallback(() => {
		if (soleAction) {
			openAction(soleAction.id);
			return;
		}
		setListOpen((open) => !open);
	}, [openAction]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "k" || !(event.metaKey || event.ctrlKey)) return;
			if (isTypingTarget(event.target)) return;
			// Chrome's omnibox and Firefox's search bar claim this chord.
			event.preventDefault();
			trigger();
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [trigger]);

	const fabLabel = soleAction ? soleAction.label : "Acciones rápidas";
	const Icon = soleAction?.icon;

	const fab = (
		<Button
			aria-label={`${fabLabel} (${shortcutLabel})`}
			className="fixed right-4 bottom-4 z-30 size-12 rounded-full shadow-lg md:right-6 md:bottom-6"
			onClick={soleAction ? trigger : undefined}
			size="icon"
			type="button"
		>
			{Icon ? <Icon className="size-5" /> : null}
		</Button>
	);

	return (
		<>
			{soleAction ? (
				<Tooltip>
					<TooltipTrigger asChild>{fab}</TooltipTrigger>
					<TooltipContent side="left">
						{fabLabel} · {shortcutLabel}
					</TooltipContent>
				</Tooltip>
			) : (
				<Popover onOpenChange={setListOpen} open={listOpen}>
					<PopoverTrigger asChild>{fab}</PopoverTrigger>
					<PopoverContent align="end" className="w-72 p-1" side="top">
						{adminQuickActions.map((action) => (
							<Button
								className="h-auto w-full justify-start gap-3 px-3 py-2 text-left"
								key={action.id}
								onClick={() => openAction(action.id)}
								type="button"
								variant="ghost"
							>
								<action.icon className="size-4 shrink-0" />
								<span className="flex flex-col gap-0.5">
									<span className="font-medium">{action.label}</span>
									<span className="text-muted-foreground text-xs">
										{action.description}
									</span>
								</span>
							</Button>
						))}
					</PopoverContent>
				</Popover>
			)}

			{glossaryRequested ? (
				<GlossaryDialog
					onOpenChange={(open) => setActiveAction(open ? "glossary" : null)}
					open={activeAction === "glossary"}
				/>
			) : null}
		</>
	);
}
