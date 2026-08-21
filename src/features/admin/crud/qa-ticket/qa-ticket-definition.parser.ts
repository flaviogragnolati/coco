/**
 * Splits the plain-text `steps` column of a QA ticket into the blocks the
 * detail dialog renders. The convention is a `Precondiciones:` line followed by
 * `N)` steps, but the corpus predates it: every line the convention does not
 * cover is kept verbatim in `context`, so nothing ever disappears from screen.
 *
 * The parser classifies. The only text it drops is the structural prefix the UI
 * replaces with a heading or a list marker; beyond that it normalises line
 * endings and nothing else. No Markdown, no HTML, no renumbering — the caller
 * renders plain strings as React text.
 */

/** Both match the structural prefix only; the visible text is what follows. */
const PRECONDITION_PREFIX = /^precondici(?:ón|ones)\s*:/i;
const STEP_PREFIX = /^(\d+)\)/;

export type QaTicketDefinitionStep = {
	/** The number as written in the source — never renumbered nor filled in. */
	number: number;
	text: string;
};

export type QaTicketDefinitionParts = {
	preconditions: string[];
	steps: QaTicketDefinitionStep[];
	/** Lines outside the convention, in their original order. */
	context: string[];
	/**
	 * False when nothing was recognised, which is the signal for the caller to
	 * fall back to the raw text instead of composing an empty structure.
	 */
	hasStructure: boolean;
};

export function parseQaTicketDefinition(
	steps: string,
): QaTicketDefinitionParts {
	const preconditions: string[] = [];
	const parsedSteps: QaTicketDefinitionStep[] = [];
	const context: string[] = [];

	for (const rawLine of steps.replace(/\r\n?/g, "\n").split("\n")) {
		const line = rawLine.trim();
		if (!line) continue;

		// A prefix with nothing after it stays raw: the semantic block it would
		// open has no text to show, and dropping the line would lose it.
		const precondition = PRECONDITION_PREFIX.exec(line);
		if (precondition) {
			const value = line.slice(precondition[0].length).trim();
			if (value) {
				preconditions.push(value);
				continue;
			}
		}

		const step = STEP_PREFIX.exec(line);
		const stepNumber = step?.[1];
		if (step && stepNumber) {
			const value = line.slice(step[0].length).trim();
			if (value) {
				parsedSteps.push({
					number: Number.parseInt(stepNumber, 10),
					text: value,
				});
				continue;
			}
		}

		context.push(rawLine);
	}

	return {
		preconditions,
		steps: parsedSteps,
		context,
		hasStructure: preconditions.length > 0 || parsedSteps.length > 0,
	};
}
