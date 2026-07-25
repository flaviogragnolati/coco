"use client";

import { AlertTriangleIcon, CheckIcon, MinusIcon } from "lucide-react";
import { Fragment } from "react";

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { formatDateTimeShort } from "~/shared/common/date.helpers";

/**
 * Presentational journey ("recorrido") stepper. Deliberately generic — keys are
 * plain strings and no admin type is imported — so the customer timeline can
 * reuse it with its own (shorter) stage list. Callers map their domain model to
 * this view-model.
 *
 * Mirrors the dual desktop/mobile layout of `checkout-stepper.tsx`; colors follow
 * the admin status convention (`status-presets.ts`): success / primary /
 * attention / inert.
 */

export type TrackingJourneyStepperStage = {
	key: string;
	label: string;
	description?: string;
	status: "completed" | "current" | "pending" | "skipped";
	warning: boolean;
	timestamp?: string;
	noticeLabels?: string[];
};

function circleClassName(stage: TrackingJourneyStepperStage) {
	return cn(
		"relative flex size-8 shrink-0 items-center justify-center rounded-full border font-medium text-xs",
		stage.status === "current"
			? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
			: stage.status === "completed"
				? "border-transparent bg-success text-success-foreground"
				: stage.status === "skipped"
					? "border-warning border-dashed text-warning"
					: "border-border text-muted-foreground/60",
	);
}

function connectorClassName(stage: TrackingJourneyStepperStage) {
	return cn(
		"h-0.5 flex-1 rounded-full",
		stage.status === "completed"
			? "bg-success"
			: stage.status === "skipped"
				? "bg-warning/40"
				: "bg-border",
	);
}

function formatTimestamp(value?: string) {
	if (!value) return null;
	return formatDateTimeShort(new Date(value));
}

function StageCircle({
	stage,
	stepNumber,
}: {
	stage: TrackingJourneyStepperStage;
	stepNumber: number;
}) {
	return (
		<span
			aria-current={stage.status === "current" ? "step" : undefined}
			className={circleClassName(stage)}
		>
			{stage.status === "completed" ? (
				<CheckIcon className="size-4" />
			) : stage.status === "skipped" ? (
				<MinusIcon className="size-4" />
			) : (
				<span>{stepNumber}</span>
			)}
			{stage.warning ? (
				<AlertTriangleIcon className="absolute -top-1 -right-1 size-3.5 rounded-full bg-background text-warning" />
			) : null}
		</span>
	);
}

function stageHint(stage: TrackingJourneyStepperStage) {
	const timestamp = formatTimestamp(stage.timestamp);

	return (
		<div className="flex max-w-56 flex-col gap-1">
			<span className="font-medium">{stage.label}</span>
			{stage.description ? (
				<span className="text-xs">{stage.description}</span>
			) : null}
			{timestamp ? <span className="text-xs">{timestamp}</span> : null}
			{stage.status === "skipped" ? (
				<span className="text-xs">Sin evento registrado para esta etapa.</span>
			) : null}
			{stage.noticeLabels?.map((label) => (
				<span className="text-xs" key={label}>
					⚠ {label}
				</span>
			))}
		</div>
	);
}

export function TrackingJourneyStepper({
	stages,
}: {
	stages: TrackingJourneyStepperStage[];
}) {
	if (stages.length === 0) return null;

	return (
		<nav aria-label="Recorrido del item">
			{/* Desktop: circles joined by connectors, truncated labels below. */}
			<ol className="hidden items-start gap-1 sm:flex">
				{stages.map((stage, index) => {
					const isLast = index === stages.length - 1;

					return (
						<li
							className={cn("flex items-start gap-1", !isLast && "flex-1")}
							key={stage.key}
						>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="flex w-16 min-w-0 cursor-help flex-col items-center gap-1 text-center">
										<StageCircle stage={stage} stepNumber={index + 1} />
										<span
											className={cn(
												"line-clamp-2 text-[11px] leading-tight",
												stage.status === "current"
													? "font-medium text-foreground"
													: stage.status === "pending"
														? "text-muted-foreground/60"
														: "text-muted-foreground",
											)}
										>
											{stage.label}
										</span>
									</div>
								</TooltipTrigger>
								<TooltipContent>{stageHint(stage)}</TooltipContent>
							</Tooltip>
							{isLast ? null : (
								<span
									aria-hidden
									className={cn(connectorClassName(stage), "mt-4")}
								/>
							)}
						</li>
					);
				})}
			</ol>

			{/* Mobile: vertical list — circle + label + timestamp per row. */}
			<ol className="flex flex-col sm:hidden">
				{stages.map((stage, index) => {
					const isLast = index === stages.length - 1;
					const timestamp = formatTimestamp(stage.timestamp);

					return (
						<Fragment key={stage.key}>
							<li className="flex items-center gap-3">
								<StageCircle stage={stage} stepNumber={index + 1} />
								<div className="flex min-w-0 flex-col">
									<span
										className={cn(
											"text-sm",
											stage.status === "current"
												? "font-medium text-foreground"
												: stage.status === "pending"
													? "text-muted-foreground/60"
													: "text-muted-foreground",
										)}
									>
										{stage.label}
									</span>
									{timestamp ? (
										<span className="text-[11px] text-muted-foreground">
											{timestamp}
										</span>
									) : null}
									{stage.status === "skipped" ? (
										<span className="text-[11px] text-warning">
											Sin evento registrado
										</span>
									) : null}
									{stage.noticeLabels?.map((label) => (
										<span className="text-[11px] text-warning" key={label}>
											{label}
										</span>
									))}
								</div>
							</li>
							{isLast ? null : (
								<span
									aria-hidden
									className={cn(
										"ml-4 h-4 w-0.5 rounded-full",
										stage.status === "completed"
											? "bg-success"
											: stage.status === "skipped"
												? "bg-warning/40"
												: "bg-border",
									)}
								/>
							)}
						</Fragment>
					);
				})}
			</ol>
		</nav>
	);
}
