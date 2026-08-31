import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OptionPill } from "./option-pill";

describe("OptionPill", () => {
    it("renders a compact subtle-glass option without action-button styling", () => {
        render(<OptionPill>Litigation</OptionPill>);

        const option = screen.getByRole("button", { name: "Litigation" });
        expect(option).toHaveAttribute("data-slot", "option-pill");
        expect(option).toHaveClass(
            "rounded-full",
            "surface-inset",
            "surface-hover",
            "text-xs",
        );
        expect(option).not.toHaveClass("bg-surface", "");
    });
});
