import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TabPillButton } from "./tab-pill-button";

describe("TabPillButton", () => {
    it("defaults to type=button", () => {
        render(<TabPillButton>All</TabPillButton>);
        expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
            "type",
            "button",
        );
    });

    it("reports its selected state to assistive tech", () => {
        render(<TabPillButton active>Mine</TabPillButton>);
        const button = screen.getByRole("button", { name: "Mine" });
        expect(button).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        expect(button).toHaveClass(
            "border-rule/80",
            "bg-surface",
            "text-ink",
        );
        expect(button).not.toHaveClass("surface-selected");
    });

    it("omits aria-pressed when the button is not a toggle", () => {
        render(<TabPillButton>Neutral</TabPillButton>);
        const button = screen.getByRole("button", { name: "Neutral" });
        expect(button).not.toHaveAttribute("aria-pressed");
        expect(button).toHaveClass("surface-hover");
    });

    it("has a visible keyboard focus ring", () => {
        render(<TabPillButton active>Mine</TabPillButton>);
        expect(screen.getByRole("button", { name: "Mine" })).toHaveClass(
            "surface-inset",
            "focus-visible:ring-2",
        );
    });
});
