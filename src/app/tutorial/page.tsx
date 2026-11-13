import type { Metadata } from "next";

import { TutorialPlayer } from "~/features/tutorial/_components/tutorial-player";
import { parseTutorialParams } from "~/features/tutorial/tutorial-script";

export const metadata: Metadata = {
	title: "Tutorial | CoCo",
	robots: { index: false, follow: false },
};

/**
 * Outside the storefront group on purpose: its layout mounts the real navbar,
 * mini-cart and cart sync, none of which may run here (ADR 0012). It reads no
 * session and calls no API.
 */
export default async function TutorialPage({
	searchParams,
}: {
	searchParams: Promise<{
		version?: string | string[];
		paso?: string | string[];
		volver?: string | string[];
	}>;
}) {
	const { version, stepIndex, returnTo } = parseTutorialParams(
		await searchParams,
	);

	return (
		<div className="font-sans" data-storefront="">
			<TutorialPlayer
				initialStepIndex={stepIndex}
				nowIso={new Date().toISOString()}
				returnTo={returnTo}
				version={version}
			/>
		</div>
	);
}
