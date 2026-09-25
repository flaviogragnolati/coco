import { announcementMessage } from "~/features/home/home-content";

export function AnnouncementBar() {
	return (
		<div className="bg-brand-ink px-4 py-2 text-center text-brand-soft text-xs">
			{announcementMessage}
		</div>
	);
}
