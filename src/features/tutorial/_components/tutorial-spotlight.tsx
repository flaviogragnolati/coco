"use client";

import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import {
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

import { Button } from "~/components/ui/button";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
} from "~/components/ui/popover";
import {
	TUTORIAL_TARGET_ATTRIBUTE,
	type TutorialTargetId,
} from "~/features/tutorial/tutorial-script";
import { cn } from "~/lib/utils";

export type TutorialSpotlightAction = {
	label: string;
	onSelect: () => void;
	variant?: "default" | "outline";
};

type Rect = { x: number; y: number; width: number; height: number };

const CUTOUT_PADDING = 8;
const CUTOUT_RADIUS = 16;
const VIEWPORT_MARGIN = 16;
const SIDE_OFFSET = 12;
/** The simulated navbar's `min-h-16` plus its border. */
const STICKY_NAVBAR_HEIGHT = 65;
/** Matches the content's `w-[min(24rem,…)]`. */
const POPOVER_WIDTH = 384;
/** Long enough to find a portaled target and follow the sheet's slide-in. */
const SETTLE_MS = 600;
const MOBILE_QUERY = "(max-width: 767.98px)";

function toRect(rect: DOMRect | Rect): Rect {
	return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

/** A `display: contents` wrapper has no box: measure what it wraps instead. */
function measure(element: Element): Rect | null {
	if (element.getClientRects().length > 0) {
		return toRect(element.getBoundingClientRect());
	}

	let union: {
		left: number;
		top: number;
		right: number;
		bottom: number;
	} | null = null;
	for (const child of Array.from(element.children)) {
		const rect = measure(child);
		if (!rect) continue;
		union = union
			? {
					left: Math.min(union.left, rect.x),
					top: Math.min(union.top, rect.y),
					right: Math.max(union.right, rect.x + rect.width),
					bottom: Math.max(union.bottom, rect.y + rect.height),
				}
			: {
					left: rect.x,
					top: rect.y,
					right: rect.x + rect.width,
					bottom: rect.y + rect.height,
				};
	}
	return union
		? {
				x: union.left,
				y: union.top,
				width: union.right - union.left,
				height: union.bottom - union.top,
			}
		: null;
}

/** The elements that actually have boxes: itself, or what a `contents` wrapper holds. */
function boxesOf(element: Element): Element[] {
	if (element.getClientRects().length > 0) return [element];
	return Array.from(element.children).flatMap(boxesOf);
}

/**
 * `scrollIntoView` does nothing on a `display: contents` wrapper, so scroll the
 * window by the measured rect: centered below the sticky navbar, or from its top
 * when it is taller than the room. A target already in view stays put, which
 * also leaves fixed ones like the mini-cart alone.
 */
function scrollIntoViewport(rect: Rect, reducedMotion: boolean) {
	const top = STICKY_NAVBAR_HEIGHT + CUTOUT_PADDING;
	const room = window.innerHeight - top - CUTOUT_PADDING;
	const visible = rect.y >= top && rect.y + rect.height <= top + room;
	if (visible) return;

	const offset =
		rect.height > room
			? rect.y - top
			: rect.y + rect.height / 2 - (top + room / 2);
	window.scrollTo({
		top: window.scrollY + offset,
		behavior: reducedMotion ? "auto" : "smooth",
	});
}

/** Mobile and desktop may both render a target id; the visible one wins. */
function findVisibleTarget(id: TutorialTargetId) {
	const candidates = document.querySelectorAll(
		`[${TUTORIAL_TARGET_ATTRIBUTE}="${id}"]`,
	);
	for (const element of Array.from(candidates)) {
		const rect = measure(element);
		if (rect && rect.width > 0 && rect.height > 0) return element;
	}
	return null;
}

function sameRect(left: Rect | null, right: Rect | null) {
	if (left === right) return true;
	if (!left || !right) return false;
	return (
		Math.abs(left.x - right.x) < 0.5 &&
		Math.abs(left.y - right.y) < 0.5 &&
		Math.abs(left.width - right.width) < 0.5 &&
		Math.abs(left.height - right.height) < 0.5
	);
}

function useMediaQuery(query: string) {
	const [matches, setMatches] = useState(false);
	useEffect(() => {
		const media = window.matchMedia(query);
		const update = () => setMatches(media.matches);
		update();
		media.addEventListener("change", update);
		return () => media.removeEventListener("change", update);
	}, [query]);
	return matches;
}

type Lookup = "searching" | "found" | "missing";

/**
 * Finds the step's target once the scene has committed, keeps its rect current
 * through scrolls, resizes and the scene's own animations, and reports whether
 * it exists at all at this breakpoint.
 */
function useTargetRect(stepKey: string, targetId: TutorialTargetId | null) {
	const [rect, setRect] = useState<Rect | null>(null);
	const [lookup, setLookup] = useState<Lookup>("searching");
	const elementRef = useRef<Element | null>(null);

	useLayoutEffect(() => {
		elementRef.current = null;
		setRect(null);

		if (targetId === null) {
			setLookup("missing");
			return;
		}
		setLookup("searching");

		const reducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		let observer: ResizeObserver | null = null;
		let frame = 0;
		const startedAt = performance.now();

		const remeasure = () => {
			const element = elementRef.current;
			if (!element) return;
			const next = measure(element);
			setRect((current) => (sameRect(current, next) ? current : next));
		};

		const attach = (element: Element) => {
			elementRef.current = element;
			const rect = measure(element);
			if (rect) scrollIntoViewport(rect, reducedMotion);
			observer = new ResizeObserver(remeasure);
			for (const box of boxesOf(element)) observer.observe(box);
			remeasure();
			setLookup("found");
		};

		const tick = () => {
			if (!elementRef.current) {
				const element = findVisibleTarget(targetId);
				if (element) attach(element);
			} else {
				remeasure();
			}

			if (performance.now() - startedAt < SETTLE_MS) {
				frame = requestAnimationFrame(tick);
			} else if (!elementRef.current) {
				if (process.env.NODE_ENV !== "production") {
					console.warn(
						`[tutorial] step "${stepKey}": no visible target "${targetId}"`,
					);
				}
				setLookup("missing");
			}
		};
		tick();

		window.addEventListener("resize", remeasure);
		window.addEventListener("scroll", remeasure, true);
		return () => {
			cancelAnimationFrame(frame);
			observer?.disconnect();
			window.removeEventListener("resize", remeasure);
			window.removeEventListener("scroll", remeasure, true);
		};
	}, [stepKey, targetId]);

	return { rect: lookup === "found" ? rect : null, lookup };
}

function SpotlightBackdrop({ rect }: { rect: Rect | null }) {
	const maskId = useId();
	const cutout = rect
		? {
				x: rect.x - CUTOUT_PADDING,
				y: rect.y - CUTOUT_PADDING,
				width: rect.width + CUTOUT_PADDING * 2,
				height: rect.height + CUTOUT_PADDING * 2,
			}
		: null;

	return (
		// Swallows every click: the scene below is a picture, not a page.
		<svg
			aria-hidden="true"
			className="pointer-events-auto fixed inset-0 z-[60] h-full w-full"
			data-testid="tutorial-backdrop"
		>
			<defs>
				<mask id={maskId}>
					<rect fill="white" height="100%" width="100%" />
					{cutout ? (
						<rect
							className="motion-safe:transition-all motion-safe:duration-300"
							fill="black"
							rx={CUTOUT_RADIUS}
							style={cutout}
							{...cutout}
						/>
					) : null}
				</mask>
			</defs>
			<rect
				fill="rgb(0 0 0 / 0.55)"
				height="100%"
				mask={`url(#${maskId})`}
				width="100%"
			/>
			{cutout ? (
				<rect
					className="stroke-highlight motion-safe:transition-all motion-safe:duration-300"
					data-testid="tutorial-cutout"
					fill="none"
					rx={CUTOUT_RADIUS}
					strokeWidth={2}
					style={cutout}
					{...cutout}
				/>
			) : null}
		</svg>
	);
}

type Side = "top" | "right" | "bottom" | "left";

type Placement =
	| { mode: "anchored"; rect: Rect; side: Side }
	| { mode: "docked"; edge: "top" | "bottom" }
	| { mode: "centered" };

/**
 * The first side of the target with room for the whole popover. Radix only
 * flips to the opposite side, which fails for a target as tall as the
 * viewport, like the mini-cart.
 */
function sideWithRoom(rect: Rect, contentHeight: number): Side | null {
	const gap = CUTOUT_PADDING + SIDE_OFFSET + VIEWPORT_MARGIN;
	const width = Math.min(
		POPOVER_WIDTH,
		window.innerWidth - VIEWPORT_MARGIN * 2,
	);
	const room = {
		bottom: window.innerHeight - (rect.y + rect.height),
		top: rect.y,
		right: window.innerWidth - (rect.x + rect.width),
		left: rect.x,
	};
	if (room.bottom >= contentHeight + gap) return "bottom";
	if (room.top >= contentHeight + gap) return "top";
	if (room.right >= width + gap) return "right";
	if (room.left >= width + gap) return "left";
	return null;
}

/** Phones dock to the viewport edge away from the target, as does a target with no room around it. */
function placementFor(
	rect: Rect | null,
	isMobile: boolean,
	contentHeight: number,
): Placement {
	if (!rect) return { mode: "centered" };
	const side = isMobile ? null : sideWithRoom(rect, contentHeight);
	if (side) return { mode: "anchored", rect, side };
	const center = rect.y + rect.height / 2;
	return {
		mode: "docked",
		edge: center > window.innerHeight / 2 ? "top" : "bottom",
	};
}

/** The rect Radix positions against: the target, a viewport edge, or its center. */
function anchorRect(placement: Placement): Rect {
	if (placement.mode === "anchored") {
		const { rect } = placement;
		return {
			x: rect.x - CUTOUT_PADDING,
			y: rect.y - CUTOUT_PADDING,
			width: rect.width + CUTOUT_PADDING * 2,
			height: rect.height + CUTOUT_PADDING * 2,
		};
	}
	if (placement.mode === "docked") {
		const y =
			placement.edge === "bottom"
				? window.innerHeight - VIEWPORT_MARGIN
				: VIEWPORT_MARGIN;
		return { x: 0, y, width: window.innerWidth, height: 0 };
	}
	return {
		x: window.innerWidth / 2,
		y: window.innerHeight / 2,
		width: 0,
		height: 0,
	};
}

export function TutorialSpotlight({
	stepKey,
	targetId,
	title,
	body,
	position,
	canGoBack,
	onBack,
	onNext,
	onExit,
	actions,
}: {
	/** Changes on every step, so focus and measuring start over. */
	stepKey: string;
	targetId: TutorialTargetId | null;
	title: string;
	body: string;
	position: { index: number; total: number };
	canGoBack: boolean;
	onBack: () => void;
	onNext: () => void;
	onExit: () => void;
	/** Replaces "Siguiente" on the closing step. */
	actions?: TutorialSpotlightAction[];
}) {
	const titleId = useId();
	const bodyId = useId();
	const isMobile = useMediaQuery(MOBILE_QUERY);
	const { rect, lookup } = useTargetRect(stepKey, targetId);
	const primaryRef = useRef<HTMLButtonElement>(null);
	const [contentHeight, setContentHeight] = useState(0);
	const resizeObserverRef = useRef<ResizeObserver | null>(null);

	const placement = placementFor(rect, isMobile, contentHeight);
	const placementRef = useRef(placement);
	useLayoutEffect(() => {
		placementRef.current = placement;
	});
	const virtualRef = useRef({
		getBoundingClientRect: () => {
			const { x, y, width, height } = anchorRect(placementRef.current);
			return DOMRect.fromRect({ x, y, width, height });
		},
	});

	const contentRef = useCallback((node: HTMLDivElement | null) => {
		resizeObserverRef.current?.disconnect();
		if (!node) return;
		const observer = new ResizeObserver(() =>
			setContentHeight(node.offsetHeight),
		);
		observer.observe(node);
		resizeObserverRef.current = observer;
	}, []);

	// Window capture runs before Radix's document listeners, so the scene's
	// non-modal sheet sees a handled Escape and stays open.
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
				return;
			if (event.key === "Escape") {
				event.preventDefault();
				onExit();
			} else if (event.key === "ArrowRight" && !actions) {
				event.preventDefault();
				onNext();
			} else if (event.key === "ArrowLeft" && canGoBack) {
				event.preventDefault();
				onBack();
			}
		};
		window.addEventListener("keydown", onKeyDown, true);
		return () => window.removeEventListener("keydown", onKeyDown, true);
	}, [actions, canGoBack, onBack, onExit, onNext]);

	const progress = ((position.index + 1) / position.total) * 100;
	const side =
		placement.mode === "anchored"
			? placement.side
			: placement.mode === "docked" && placement.edge === "bottom"
				? "top"
				: "bottom";

	return (
		<>
			<SpotlightBackdrop rect={rect} />
			<Popover modal open={lookup !== "searching"}>
				<PopoverAnchor virtualRef={virtualRef} />
				<PopoverContent
					align="center"
					aria-describedby={bodyId}
					aria-labelledby={titleId}
					avoidCollisions={placement.mode === "anchored"}
					className={cn(
						"pointer-events-auto z-[70] flex flex-col gap-3 p-5 motion-reduce:animate-none",
						isMobile && placement.mode === "docked"
							? "w-[calc(100vw-2rem)]"
							: "w-[min(24rem,calc(100vw-2rem))]",
					)}
					collisionPadding={VIEWPORT_MARGIN}
					key={stepKey}
					onEscapeKeyDown={(event) => event.preventDefault()}
					onInteractOutside={(event) => event.preventDefault()}
					onOpenAutoFocus={(event) => {
						event.preventDefault();
						primaryRef.current?.focus();
					}}
					ref={contentRef}
					side={side}
					sideOffset={
						placement.mode === "centered" ? -contentHeight / 2 : SIDE_OFFSET
					}
					updatePositionStrategy="always"
				>
					<div className="flex items-center justify-between gap-3">
						<span
							className="font-medium text-muted-foreground text-xs tabular-nums"
							data-testid="tutorial-step-counter"
						>
							{position.index + 1} / {position.total}
						</span>
						<Button
							aria-label="Salir del tutorial"
							onClick={onExit}
							size="icon-xs"
							type="button"
							variant="ghost"
						>
							<XIcon />
						</Button>
					</div>
					<div
						aria-hidden="true"
						className="h-1 w-full overflow-hidden rounded-full bg-muted"
					>
						<div
							className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-300"
							style={{ width: `${progress}%` }}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<h2 className="font-heading font-semibold text-base" id={titleId}>
							{title}
						</h2>
						<p className="text-muted-foreground text-sm/relaxed" id={bodyId}>
							{body}
						</p>
					</div>
					<div className="flex flex-wrap items-center justify-end gap-2 pt-1">
						{canGoBack ? (
							<Button
								className="mr-auto"
								onClick={onBack}
								size="sm"
								type="button"
								variant="ghost"
							>
								<ChevronLeftIcon data-icon="inline-start" />
								Atrás
							</Button>
						) : null}
						{actions ? (
							actions.map((action, index) => (
								<Button
									key={action.label}
									onClick={action.onSelect}
									ref={index === 0 ? primaryRef : undefined}
									size="sm"
									type="button"
									variant={action.variant ?? "default"}
								>
									{action.label}
								</Button>
							))
						) : (
							<Button onClick={onNext} ref={primaryRef} size="sm" type="button">
								Siguiente
								<ChevronRightIcon data-icon="inline-end" />
							</Button>
						)}
					</div>
				</PopoverContent>
			</Popover>
		</>
	);
}
