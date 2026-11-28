import { expect, test } from "vitest";

import {
	HOME_OFFERS_PREVIEW_HEIGHT_MESSAGE,
	isPreviewHeightMessage,
} from "./home-offers-preview";

const type = HOME_OFFERS_PREVIEW_HEIGHT_MESSAGE;

test.each([
	["a valid height", { type, height: 640 }, true],
	["a zero height", { type, height: 0 }, true],
	["another message type", { type: "other", height: 640 }, false],
	["a string height", { type, height: "640" }, false],
	["a NaN height", { type, height: Number.NaN }, false],
	["an infinite height", { type, height: Number.POSITIVE_INFINITY }, false],
	["a negative height", { type, height: -1 }, false],
	["null", null, false],
	["a string", type, false],
])("isPreviewHeightMessage accepts %s: %s", (_, data, expected) => {
	expect(isPreviewHeightMessage(data)).toBe(expected);
});
