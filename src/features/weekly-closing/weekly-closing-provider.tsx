"use client";

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { getNextClosing } from "~/shared/common/date.helpers";
import type { WeeklyClosingSchedule } from "~/shared/common/weekly-closing";

type WeeklyClosingContextValue = {
	schedule: WeeklyClosingSchedule;
	now: Date;
	nextClosing: Date;
};

const WeeklyClosingContext = createContext<WeeklyClosingContextValue | null>(
	null,
);

const MINUTE_MS = 60_000;
/** A device clock further off than this follows the server instead. */
const MAX_TRUSTED_SKEW_MS = 2 * MINUTE_MS;

/**
 * Measured once per document, at the hydrating mount. A later remount can get
 * a cached layout payload (back/forward), whose server instant is stale, not a
 * sign of a wrong device clock.
 */
let documentSkewMs: number | undefined;

function measureSkew(serverNowIso: string) {
	const measured = Date.parse(serverNowIso) - Date.now();
	return Math.abs(measured) > MAX_TRUSTED_SKEW_MS ? measured : 0;
}

/**
 * One minute-resolution clock for every closing text in the storefront. The
 * first client render reuses the server instant so hydration matches; after
 * mount the clock follows the device, corrected by the server offset when the
 * device is clearly wrong.
 */
export function WeeklyClosingProvider({
	schedule,
	serverNowIso,
	children,
}: {
	schedule: WeeklyClosingSchedule;
	serverNowIso: string;
	children: ReactNode;
}) {
	const [now, setNow] = useState(() => new Date(serverNowIso));

	useEffect(() => {
		documentSkewMs ??= measureSkew(serverNowIso);
		const skew = documentSkewMs;
		const current = () => Date.now() + skew;
		const tick = () => setNow(new Date(current()));

		let interval: ReturnType<typeof setInterval> | undefined;
		const timeout = setTimeout(
			() => {
				tick();
				interval = setInterval(tick, MINUTE_MS);
			},
			MINUTE_MS - (current() % MINUTE_MS),
		);
		// Background tabs throttle timers, so catch up when the tab comes back.
		const onVisibilityChange = () => {
			if (document.visibilityState === "visible") tick();
		};

		tick();
		document.addEventListener("visibilitychange", onVisibilityChange);
		return () => {
			clearTimeout(timeout);
			clearInterval(interval);
			document.removeEventListener("visibilitychange", onVisibilityChange);
		};
	}, [serverNowIso]);

	const value = useMemo(
		() => ({ schedule, now, nextClosing: getNextClosing(now, schedule) }),
		[schedule, now],
	);

	return (
		<WeeklyClosingContext.Provider value={value}>
			{children}
		</WeeklyClosingContext.Provider>
	);
}

/** `null` outside the storefront, where nothing should mention the closing. */
export function useWeeklyClosing() {
	return useContext(WeeklyClosingContext);
}
