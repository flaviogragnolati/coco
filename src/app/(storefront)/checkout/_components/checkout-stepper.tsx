"use client";

import { CheckIcon } from "lucide-react";
import { Fragment } from "react";

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import {
	type CheckoutSelection,
	type CheckoutStepDefinition,
	type CheckoutStepId,
	isStepComplete,
	isStepReachable,
} from "./checkout-steps";

type StepVisualState = {
	completed: boolean;
	active: boolean;
	reachable: boolean;
};

function stepCircleClassName({
	completed,
	active,
	reachable,
}: StepVisualState) {
	return cn(
		"flex size-8 shrink-0 items-center justify-center rounded-full border font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
		active
			? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
			: completed
				? "border-transparent bg-success text-success-foreground"
				: reachable
					? "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
					: "cursor-not-allowed border-border text-muted-foreground/40",
	);
}

function StepCircle({
	state,
	stepNumber,
	label,
	onActivate,
}: {
	state: StepVisualState;
	stepNumber: number;
	label: string;
	onActivate: () => void;
}) {
	const { completed, active, reachable } = state;
	const circle = (
		<button
			aria-current={active ? "step" : undefined}
			aria-label={`Paso ${stepNumber}: ${label}`}
			className={stepCircleClassName(state)}
			disabled={!reachable}
			onClick={onActivate}
			type="button"
		>
			{completed && !active ? (
				<CheckIcon className="size-4" />
			) : (
				<span>{stepNumber}</span>
			)}
		</button>
	);

	if (reachable) return circle;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				{/* Wrapper keeps the tooltip working on a disabled button. */}
				<span className="inline-flex">{circle}</span>
			</TooltipTrigger>
			<TooltipContent>Completá los pasos anteriores</TooltipContent>
		</Tooltip>
	);
}

export function CheckoutStepper({
	steps,
	currentStep,
	selection,
	onStepChange,
}: {
	steps: CheckoutStepDefinition[];
	currentStep: CheckoutStepId;
	selection: CheckoutSelection;
	onStepChange: (id: CheckoutStepId) => void;
}) {
	const currentIndex = steps.findIndex((step) => step.id === currentStep);
	const currentLabel = steps[currentIndex]?.label ?? "";

	const handleActivate = (step: CheckoutStepDefinition) => {
		if (!isStepReachable(step.id, selection)) return;
		onStepChange(step.id);
	};

	return (
		<nav aria-label="Progreso del checkout">
			{/* Desktop: numbered circles + labels joined by connectors */}
			<ol className="hidden items-center gap-2 sm:flex">
				{steps.map((step, index) => {
					const completed = isStepComplete(step.id, selection);
					const active = step.id === currentStep;
					const reachable = isStepReachable(step.id, selection);
					const isLast = index === steps.length - 1;

					return (
						<li
							className={cn("flex items-center gap-2", !isLast && "flex-1")}
							key={step.id}
						>
							<div className="flex items-center gap-2">
								<StepCircle
									label={step.label}
									onActivate={() => handleActivate(step)}
									state={{ completed, active, reachable }}
									stepNumber={index + 1}
								/>
								<span
									className={cn(
										"font-medium text-sm transition-colors",
										active
											? "text-foreground"
											: reachable
												? "text-muted-foreground"
												: "text-muted-foreground/40",
									)}
								>
									{step.label}
								</span>
							</div>
							{isLast ? null : (
								<span
									aria-hidden
									className={cn(
										"h-0.5 flex-1 rounded-full transition-colors",
										completed ? "bg-success" : "bg-border",
									)}
								/>
							)}
						</li>
					);
				})}
			</ol>

			{/* Mobile: compact circles row + "Paso n de N · label" line */}
			<div className="flex flex-col gap-2 sm:hidden">
				<ol className="flex items-center gap-1.5">
					{steps.map((step, index) => {
						const completed = isStepComplete(step.id, selection);
						const active = step.id === currentStep;
						const reachable = isStepReachable(step.id, selection);
						const isLast = index === steps.length - 1;

						return (
							<Fragment key={step.id}>
								<li className="flex">
									<StepCircle
										label={step.label}
										onActivate={() => handleActivate(step)}
										state={{ completed, active, reachable }}
										stepNumber={index + 1}
									/>
								</li>
								{isLast ? null : (
									<span
										aria-hidden
										className={cn(
											"h-0.5 flex-1 rounded-full transition-colors",
											completed ? "bg-success" : "bg-border",
										)}
									/>
								)}
							</Fragment>
						);
					})}
				</ol>
				<p className="text-muted-foreground text-sm">
					Paso {currentIndex + 1} de {steps.length} ·{" "}
					<span className="font-medium text-foreground">{currentLabel}</span>
				</p>
			</div>
		</nav>
	);
}
