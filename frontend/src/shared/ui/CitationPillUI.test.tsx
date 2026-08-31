import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CitationPillUI } from "./CitationPillUI";

describe("CitationPillUI", () => {
    it("uses the neutral citation style and defaults to a non-submit button", () => {
        render(<CitationPillUI aria-label="Citation 3">3</CitationPillUI>);

        expect(screen.getByRole("button", { name: "Citation 3" })).toHaveClass(
            "bg-surface-sunk/80",
            "text-ink",
        );
        expect(screen.getByRole("button", { name: "Citation 3" })).not.toHaveClass(
            "surface-panel",
        );
        expect(screen.getByRole("button", { name: "Citation 3" })).toHaveAttribute(
            "type",
            "button",
        );
    });

    it("exposes its active state for styling and accessibility", () => {
        render(
            <CitationPillUI active aria-label="Citation 4">
                4
            </CitationPillUI>,
        );

        const pill = screen.getByRole("button", { name: "Citation 4" });
        expect(pill).toHaveAttribute("aria-current", "true");
        expect(pill).toHaveAttribute("data-active", "true");
        expect(pill).toHaveClass(
            "!bg-accent-wash",
            "!text-accent-wash",
            "dark:!bg-accent-wash",
            "dark:!text-paper",
        );
    });
});
