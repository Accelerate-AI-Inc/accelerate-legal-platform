import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IconButton } from "./icon-button";

describe("IconButton", () => {
    it("exposes the required accessible name", () => {
        render(
            <IconButton aria-label="Close">
                <svg />
            </IconButton>,
        );
        expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    it("defaults to type=button so it never submits a form", () => {
        render(
            <IconButton aria-label="Close">
                <svg />
            </IconButton>,
        );
        expect(screen.getByRole("button", { name: "Close" })).toHaveAttribute(
            "type",
            "button",
        );
    });

    it("carries the shared glass surface classes", () => {
        render(
            <IconButton aria-label="Close">
                <svg />
            </IconButton>,
        );
        expect(screen.getByRole("button", { name: "Close" })).toHaveClass(
            "h-7",
            "w-7",
            "rounded-full",
            "surface-inset",
            "surface-hover",
            "",
        );
    });

    it("has a visible keyboard focus ring", () => {
        render(
            <IconButton aria-label="Close">
                <svg />
            </IconButton>,
        );
        expect(screen.getByRole("button", { name: "Close" })).toHaveClass(
            "focus-visible:ring-2",
        );
    });

    it("lets callers override classes without losing the base", () => {
        render(
            <IconButton aria-label="Close" className="ml-auto">
                <svg />
            </IconButton>,
        );
        const button = screen.getByRole("button", { name: "Close" });
        expect(button).toHaveClass("ml-auto", "rounded-full");
    });

    it("fires onClick when activated", async () => {
        const onClick = vi.fn();
        const user = userEvent.setup();
        render(
            <IconButton aria-label="Close" onClick={onClick}>
                <svg />
            </IconButton>,
        );

        await user.click(screen.getByRole("button", { name: "Close" }));

        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
