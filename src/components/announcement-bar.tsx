import { announcementMessage } from "~/features/home/home-content";
import { ClosingCountdown } from "~/features/weekly-closing/closing-countdown";

/** Below `lg` the countdown takes this strip; from `lg` it sits in the navbar. */
export function AnnouncementBar() {
	return (
		<div className="bg-brand-ink px-4 py-2 text-center text-brand-soft text-xs">
			<ClosingCountdown className="lg:hidden" />
			<span className="hidden lg:inline">{announcementMessage}</span>
		</div>
	);
}
