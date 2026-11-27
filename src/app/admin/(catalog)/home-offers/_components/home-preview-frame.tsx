"use client";

import { useEffect, useRef, useState } from "react";

import { Skeleton } from "~/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
	HOME_OFFERS_PREVIEW_PATH,
	isPreviewHeightMessage,
} from "~/features/admin/crud/home-offers/home-offers-preview";

const DESKTOP_WIDTH = 1280;
const PHONE_WIDTH = 390;
const LOADING_FRAME_HEIGHT = 800;
// How long a loaded page may take to report before it counts as failed.
const REPORT_TIMEOUT_MS = 4000;
// The phone frame's 1px border on each side, kept outside its 390px viewport.
const PHONE_BORDER = 2;

type PreviewViewport = "desktop" | "phone";

type Measurement = {
	version: number;
	viewport: PreviewViewport;
	height: number;
};

/**
 * The home's band and section in an iframe, so the storefront's viewport
 * breakpoints apply at a real desktop or phone width. `version` reloads it.
 */
export function HomePreviewFrame({ version }: { version: number }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const [viewport, setViewport] = useState<PreviewViewport>("desktop");
	const [containerWidth, setContainerWidth] = useState(0);
	const [measurement, setMeasurement] = useState<Measurement | null>(null);
	const [failedVersion, setFailedVersion] = useState<number | null>(null);
	const reportTimeout = useRef<number | undefined>(undefined);

	useEffect(() => () => window.clearTimeout(reportTimeout.current), []);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const observer = new ResizeObserver(([entry]) => {
			if (entry) setContainerWidth(entry.contentRect.width);
		});
		observer.observe(container);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		const onMessage = (event: MessageEvent) => {
			if (event.origin !== window.location.origin) return;
			if (event.source !== iframeRef.current?.contentWindow) return;
			if (!isPreviewHeightMessage(event.data)) return;
			window.clearTimeout(reportTimeout.current);
			setFailedVersion(null);
			setMeasurement({ version, viewport, height: event.data.height });
		};
		window.addEventListener("message", onMessage);
		return () => window.removeEventListener("message", onMessage);
	}, [version, viewport]);

	// A height measured for another version or width is stale until the
	// preview reports again.
	const contentHeight =
		measurement?.version === version && measurement.viewport === viewport
			? measurement.height
			: null;
	const failed = failedVersion === version && contentHeight === null;
	const isDesktop = viewport === "desktop";
	const scale =
		isDesktop && containerWidth > 0
			? Math.min(1, containerWidth / DESKTOP_WIDTH)
			: 1;
	const border = isDesktop ? 0 : PHONE_BORDER;
	const frameWidth = (isDesktop ? DESKTOP_WIDTH : PHONE_WIDTH) + border;
	const frameHeight = (contentHeight ?? LOADING_FRAME_HEIGHT) + border;

	return (
		<div className="flex flex-col gap-3">
			<ToggleGroup
				aria-label="Ancho de la vista previa"
				onValueChange={(value) => {
					if (value) setViewport(value as PreviewViewport);
				}}
				type="single"
				value={viewport}
				variant="outline"
			>
				<ToggleGroupItem value="desktop">Escritorio</ToggleGroupItem>
				<ToggleGroupItem value="phone">Celular</ToggleGroupItem>
			</ToggleGroup>

			<div
				className="relative w-full overflow-hidden"
				ref={containerRef}
				style={{
					height: contentHeight === null ? undefined : frameHeight * scale,
				}}
			>
				{failed ? (
					<div className="absolute inset-x-0 top-0 z-10 flex h-96 items-center justify-center rounded-2xl border bg-muted p-6 text-center text-muted-foreground text-sm">
						No se pudo cargar la vista previa. Recargá la página para intentarlo
						de nuevo.
					</div>
				) : contentHeight === null ? (
					<Skeleton className="absolute inset-x-0 top-0 z-10 h-96 w-full" />
				) : null}
				<div
					className={contentHeight === null ? "h-96" : undefined}
					style={{
						width: frameWidth * scale,
						marginInline: "auto",
					}}
				>
					<iframe
						className={
							isDesktop
								? "block bg-background"
								: "block rounded-3xl border bg-background"
						}
						key={version}
						// A redirect (expired session) or an error page loads without
						// the height reporter, which would leave the skeleton forever.
						onLoad={() => {
							window.clearTimeout(reportTimeout.current);
							reportTimeout.current = window.setTimeout(
								() => setFailedVersion(version),
								REPORT_TIMEOUT_MS,
							);
						}}
						ref={iframeRef}
						src={`${HOME_OFFERS_PREVIEW_PATH}?v=${version}`}
						style={{
							width: frameWidth,
							height: frameHeight,
							transform: scale === 1 ? undefined : `scale(${scale})`,
							transformOrigin: "top left",
						}}
						tabIndex={-1}
						title="Vista previa del home"
					/>
				</div>
			</div>
		</div>
	);
}
