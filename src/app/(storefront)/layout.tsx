import { AnnouncementBar } from "~/components/announcement-bar";
import { AppNavbar } from "~/components/app-navbar";
import { CartSheet } from "~/features/cart/_components/cart-sheet";
import { TutorialInvitation } from "~/features/tutorial/_components/tutorial-invitation";
import { isTutorialInvitationEligible } from "~/features/tutorial/tutorial-invitation.decision";
import { WeeklyClosingProvider } from "~/features/weekly-closing/weekly-closing-provider";
import { getSession } from "~/server/better-auth/server";
import { getWeeklyClosingSchedule } from "~/server/services/weekly-closing/weekly-closing.service";

export default async function StorefrontLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const [session, schedule] = await Promise.all([
		getSession(),
		getWeeklyClosingSchedule(),
	]);
	const user = session?.user;

	return (
		<WeeklyClosingProvider
			schedule={schedule}
			serverNowIso={new Date().toISOString()}
		>
			<div className="font-sans" data-storefront="">
				<AnnouncementBar />
				<AppNavbar session={session} />
				{children}
				<CartSheet isAuthenticated={Boolean(user)} userId={user?.id ?? null} />
				<TutorialInvitation eligible={isTutorialInvitationEligible(user)} />
			</div>
		</WeeklyClosingProvider>
	);
}
