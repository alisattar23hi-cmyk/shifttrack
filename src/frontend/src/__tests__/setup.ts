import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// Generated components expose `data-ocid` hooks; make them queryable as test ids.
configure({ testIdAttribute: "data-ocid" });

// jsdom does not implement the pointer-capture API Radix Select calls on
// pointerdown; without these stubs opening a Select throws.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// Vitest runs without globals here, so RTL's automatic cleanup is not
// registered; do it explicitly or each render stacks on the previous DOM.
afterEach(() => {
  cleanup();
});
