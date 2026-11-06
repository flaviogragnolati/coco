"use client";

import { SparklesIcon, XIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Button } from "~/components/ui/button";
import { shouldShowTutorialInvitation } from "~/features/tutorial/tutorial-invitation.decision";
import {
	TUTORIAL_VERSIONS,
	type TutorialVersion,
	tutorialHref,
	tutorialVersionMeta,
} from "~/features/tutorial/tutorial-script";
import { api } from "~/trpc/react";

/**
 * The one-time offer to take the tutorial. Any answer settles it on the server,
 * and `answered` hides it right away for the rest of this layout's life.
 */
export function TutorialInvitation({ eligible }: { eligible: boolean }) {
	const pathname = usePathname();
	const router = useRouter();
	const titleId = useId();
	const [answered, setAnswered] = useState(false);
	const answer = api.profile.answerTutorialInvitation.useMutation();

	if (
		!shouldShowTutorialInvitation({
			eligible,
			answeredLocally: answered,
			pathname,
		})
	) {
		return null;
	}

	const decline = () => {
		setAnswered(true);
		answer.mutate();
	};

	const start = async (version: TutorialVersion) => {
		setAnswered(true);
		// The tour matters more than the record: a failed write only brings the
		// invitation back on a later visit.
		await answer.mutateAsync().catch(() => undefined);
		router.push(tutorialHref({ version, returnTo: pathname }));
	};

	return (
		<section
			aria-labelledby={titleId}
			className="fixed inset-x-3 bottom-3 z-30 flex flex-col gap-3 rounded-4xl bg-popover p-5 text-popover-foreground shadow-xl ring-1 ring-foreground/10 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-full sm:max-w-sm"
		>
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-center gap-2">
					<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground">
						<SparklesIcon className="size-4" />
					</span>
					<h2 className="font-heading font-semibold text-base" id={titleId}>
						¿Primera vez en Coco?
					</h2>
				</div>
				<Button
					aria-label="Cerrar invitación"
					onClick={decline}
					size="icon-xs"
					type="button"
					variant="ghost"
				>
					<XIcon />
				</Button>
			</div>
			<p className="text-muted-foreground text-sm/relaxed">
				Te mostramos cómo es una compra en Coco, de punta a punta, con datos de
				ejemplo.
			</p>
			<div className="flex flex-col gap-2">
				{TUTORIAL_VERSIONS.map((version) => {
					const meta = tutorialVersionMeta[version];
					return (
						<Button
							key={version}
							onClick={() => void start(version)}
							type="button"
							variant={version === "rapido" ? "default" : "outline"}
						>
							{meta.label} · {meta.duration}
						</Button>
					);
				})}
				<Button onClick={decline} type="button" variant="ghost">
					Ahora no
				</Button>
			</div>
		</section>
	);
}
