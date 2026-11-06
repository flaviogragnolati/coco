"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { buildTutorialFixtures } from "~/features/tutorial/tutorial-fixtures";
import {
	type TutorialVersion,
	tutorialHref,
	tutorialScripts,
} from "~/features/tutorial/tutorial-script";
import { TutorialModeBar } from "./tutorial-mode-bar";
import { TutorialNavbar } from "./tutorial-navbar";
import { navbarStateFor, TutorialScene } from "./tutorial-scene";
import {
	TutorialSpotlight,
	type TutorialSpotlightAction,
} from "./tutorial-spotlight";

type Position = { version: TutorialVersion; stepIndex: number };

export function TutorialPlayer({
	version,
	initialStepIndex,
	returnTo,
	nowIso,
}: {
	version: TutorialVersion;
	initialStepIndex: number;
	returnTo: string;
	/** From the server, so both renders date the fixtures alike. */
	nowIso: string;
}) {
	const router = useRouter();
	const fixtures = useMemo(
		() => buildTutorialFixtures(new Date(nowIso)),
		[nowIso],
	);
	const [position, setPosition] = useState<Position>({
		version,
		stepIndex: initialStepIndex,
	});
	const script = tutorialScripts[position.version];
	const stepIndex = Math.min(position.stepIndex, script.length - 1);
	const step = script[stepIndex] ?? script[0];
	const isClosing = step?.closing === true;

	// A history replace, not a navigation: reload keeps the step, Back leaves the
	// tutorial, and no step costs a server render.
	const goTo = useCallback(
		(next: Position) => {
			setPosition(next);
			window.history.replaceState(
				null,
				"",
				tutorialHref({ ...next, returnTo }),
			);
		},
		[returnTo],
	);

	const exit = useCallback(() => router.replace(returnTo), [router, returnTo]);
	const onBack = useCallback(() => {
		if (stepIndex > 0)
			goTo({ version: position.version, stepIndex: stepIndex - 1 });
	}, [goTo, position.version, stepIndex]);
	const onNext = useCallback(() => {
		if (stepIndex < script.length - 1)
			goTo({ version: position.version, stepIndex: stepIndex + 1 });
	}, [goTo, position.version, script.length, stepIndex]);

	const closingActions = useMemo<TutorialSpotlightAction[] | undefined>(() => {
		if (!isClosing) return undefined;
		return position.version === "rapido"
			? [
					{
						label: "Ver el tutorial completo",
						onSelect: () => goTo({ version: "completo", stepIndex: 0 }),
					},
					{ label: "Terminar", onSelect: exit, variant: "outline" },
				]
			: [
					{
						label: "Ir al catálogo",
						onSelect: () => router.replace("/products"),
					},
					{ label: "Terminar", onSelect: exit, variant: "outline" },
				];
	}, [exit, goTo, isClosing, position.version, router]);

	if (!step) return null;

	return (
		<>
			<TutorialModeBar onExit={exit} />
			<div data-testid="tutorial-scene" inert>
				<TutorialNavbar {...navbarStateFor(step.scene, fixtures)} />
				<TutorialScene fixtures={fixtures} scene={step.scene} />
			</div>
			<TutorialSpotlight
				actions={closingActions}
				body={step.body}
				canGoBack={stepIndex > 0}
				onBack={onBack}
				onExit={exit}
				onNext={onNext}
				position={{ index: stepIndex, total: script.length }}
				stepKey={`${position.version}:${step.id}`}
				targetId={step.target}
				title={step.title}
			/>
		</>
	);
}
