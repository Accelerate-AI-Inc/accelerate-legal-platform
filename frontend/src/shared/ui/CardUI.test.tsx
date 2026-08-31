import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
    CARD_SURFACE_CLASS,
    CardUI,
} from "./CardUI";

describe("CardUI", () => {
    it("renders the shared glass surface around its children", () => {
        render(
            <CardUI>
                <p>Shared content</p>
            </CardUI>,
        );

        expect(screen.getByText("Shared content").parentElement).toHaveClass(
            ...CARD_SURFACE_CLASS.split(" "),
        );
    });
});
