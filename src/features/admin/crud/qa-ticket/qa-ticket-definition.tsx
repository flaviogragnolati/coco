import { cn } from "~/lib/utils";
import { parseQaTicketDefinition } from "./qa-ticket-definition.parser";

const blockClass = "flex min-w-0 flex-col gap-2 rounded-2xl border";
const headingClass =
	"font-semibold text-muted-foreground text-xs uppercase tracking-wide";
const textClass = "wrap-break-word whitespace-pre-line text-sm";

/**
 * Read-only rendering of what a QA case asks the tester to do. It knows nothing
 * about ownership, evidence or the pass result: it receives the two text
 * columns and renders them as React text — never as markup.
 */
export function QaTicketDefinition({
	expectedResult,
	steps,
}: {
	expectedResult: string;
	steps: string;
}) {
	const definition = parseQaTicketDefinition(steps);

	return (
		<div className="flex min-w-0 flex-col gap-3">
			{definition.hasStructure ? (
				<>
					{definition.preconditions.length > 0 ? (
						<section
							className={cn(blockClass, "border-dashed bg-muted/30 p-3")}
						>
							<h3 className={headingClass}>Antes de empezar</h3>
							<ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
								{definition.preconditions.map((precondition) => (
									<li className="wrap-break-word" key={precondition}>
										{precondition}
									</li>
								))}
							</ul>
						</section>
					) : null}

					{definition.steps.length > 0 ? (
						<section className={cn(blockClass, "p-4")}>
							<h3 className={headingClass}>Pasos</h3>
							<ol className="flex list-decimal flex-col gap-2 pl-6 text-sm leading-relaxed">
								{definition.steps.map((step) => (
									// `value` keeps the numbering the ticket was written with,
									// gaps included, instead of letting the list renumber it.
									<li
										className="wrap-break-word pl-1"
										key={`${step.number}-${step.text}`}
										value={step.number}
									>
										{step.text}
									</li>
								))}
							</ol>
						</section>
					) : null}

					{definition.context.length > 0 ? (
						<section className={cn(blockClass, "p-3")}>
							<h3 className={headingClass}>Contexto adicional</h3>
							<p className={textClass}>{definition.context.join("\n")}</p>
						</section>
					) : null}
				</>
			) : (
				<section className={cn(blockClass, "p-4")}>
					<h3 className={headingClass}>Flujo</h3>
					<p className={textClass}>{steps}</p>
				</section>
			)}

			<section className={cn(blockClass, "p-4")}>
				<h3 className={headingClass}>Qué tiene que pasar</h3>
				<p className={textClass}>{expectedResult}</p>
			</section>
		</div>
	);
}
