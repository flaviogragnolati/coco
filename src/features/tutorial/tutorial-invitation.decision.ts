export type TutorialInvitationUser = {
	active: boolean;
	deleted: boolean;
	tutorialInvitationAnsweredAt?: Date | null;
};

/**
 * Sign-in, the order page (where the customer finishes, ADR 0015), the old
 * checkout path and the payment return pages are mid-task: the invitation waits.
 */
const EXCLUDED_SECTIONS = ["/login", "/cart", "/checkout"];

export function isTutorialInvitationEligible(
	user: TutorialInvitationUser | null | undefined,
): boolean {
	if (!user) return false;
	if (!user.active || user.deleted) return false;
	return user.tutorialInvitationAnsweredAt == null;
}

function isInSection(pathname: string, section: string) {
	return pathname === section || pathname.startsWith(`${section}/`);
}

export function shouldShowTutorialInvitation(input: {
	eligible: boolean;
	/** Answered in this page's lifetime, before the server-side answer is re-read. */
	answeredLocally: boolean;
	pathname: string;
}): boolean {
	if (!input.eligible || input.answeredLocally) return false;
	return !EXCLUDED_SECTIONS.some((section) =>
		isInSection(input.pathname, section),
	);
}
