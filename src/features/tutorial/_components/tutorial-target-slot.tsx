import {
	type TutorialTargetId,
	tutorialTarget,
} from "~/features/tutorial/tutorial-script";

/** Marks what it wraps without adding a box: the spotlight measures the children. */
export function TutorialTargetSlot({
	id,
	children,
}: {
	id: TutorialTargetId;
	children: React.ReactNode;
}) {
	return (
		<div className="contents" {...tutorialTarget(id)}>
			{children}
		</div>
	);
}
