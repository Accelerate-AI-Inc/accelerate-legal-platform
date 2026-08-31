import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BrandMark } from "./brand-mark";

/** The bracket strokes, which inherit the surrounding ink. */
function bracketStrokes(container: HTMLElement) {
    return [...container.querySelectorAll("path")]
        .map((path) => path.getAttribute("stroke"))
        .filter((stroke) => stroke === "currentColor");
}

/** The rising bar, which carries the accent or a status token. */
function barStroke(container: HTMLElement) {
    return [...container.querySelectorAll("path")]
        .map((path) => path.getAttribute("stroke"))
        .find((stroke) => stroke !== "currentColor");
}

afterEach(() => {
    document.documentElement.classList.remove("dark");
});

describe("BrandMark", () => {
    it("draws its brackets in the inherited ink", () => {
        const { container } = render(<BrandMark />);

        expect(bracketStrokes(container).length).toBeGreaterThan(0);
    });

    it("draws the rising bar in the accent token", () => {
        const { container } = render(<BrandMark />);

        expect(barStroke(container)).toBe("var(--accent)");
    });

    // The mark is token-driven rather than palette-driven, so it needs no
    // theme observer: the same markup is correct in both themes. This is the
    // property that let the previous 385-line gradient implementation go.
    it("renders identically in dark mode", () => {
        const { container: light } = render(<BrandMark />);
        const lightMarkup = light.innerHTML;

        document.documentElement.classList.add("dark");
        const { container: dark } = render(<BrandMark />);

        expect(dark.innerHTML).toBe(lightMarkup);
    });

    it("recolors the bar for the done and error states", () => {
        const { container: done } = render(<BrandMark done />);
        expect(barStroke(done)).toBe("var(--positive)");

        const { container: failed } = render(<BrandMark error />);
        expect(barStroke(failed)).toBe("var(--critical)");
    });

    it("keeps the status color when the document is in dark mode", () => {
        document.documentElement.classList.add("dark");
        const { container } = render(<BrandMark done />);

        expect(barStroke(container)).toBe("var(--positive)");
    });
});
