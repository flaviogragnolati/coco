"use client";

import { useEffect } from "react";

import {
	HOME_OFFERS_PREVIEW_HEIGHT_MESSAGE,
	type HomeOffersPreviewHeightMessage,
} from "~/features/admin/crud/home-offers/home-offers-preview";

/** Tells the admin page hosting this preview how tall to make its iframe. */
export function PreviewHeightReporter() {
	useEffect(() => {
		if (window.parent === window) return;

		// The content wrapper, not the document: the body is at least as tall as
		// the iframe, so measuring the document would never let the iframe shrink.
		const content = document.querySelector("[data-storefront]");
		if (!content) return;

		const report = () => {
			const message: HomeOffersPreviewHeightMessage = {
				type: HOME_OFFERS_PREVIEW_HEIGHT_MESSAGE,
				height: Math.ceil(content.getBoundingClientRect().height),
			};
			window.parent.postMessage(message, window.location.origin);
		};

		report();
		const observer = new ResizeObserver(report);
		observer.observe(content);
		return () => observer.disconnect();
	}, []);

	return null;
}
