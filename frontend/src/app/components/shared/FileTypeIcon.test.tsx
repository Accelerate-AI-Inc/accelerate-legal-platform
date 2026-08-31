import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FileTypeIcon, fileTypeKind } from "./FileTypeIcon";

describe("fileTypeKind", () => {
    it("maps bare file_type values to a kind", () => {
        expect(fileTypeKind("pdf")).toBe("pdf");
        expect(fileTypeKind("docx")).toBe("word");
        expect(fileTypeKind("doc")).toBe("word");
        expect(fileTypeKind("xlsx")).toBe("excel");
        expect(fileTypeKind("xlsm")).toBe("excel");
        expect(fileTypeKind("xls")).toBe("excel");
        expect(fileTypeKind("pptx")).toBe("ppt");
        expect(fileTypeKind("ppt")).toBe("ppt");
    });

    it("maps filenames by their extension", () => {
        expect(fileTypeKind("report.pdf")).toBe("pdf");
        expect(fileTypeKind("Quarterly Deck.PPTX")).toBe("ppt");
        expect(fileTypeKind("model.final.xlsx")).toBe("excel");
    });

    it("is case-insensitive and trims whitespace", () => {
        expect(fileTypeKind("  PDF ")).toBe("pdf");
        expect(fileTypeKind("DOCX")).toBe("word");
    });

    it("falls back to other for unknown, empty, or nullish input", () => {
        expect(fileTypeKind("txt")).toBe("other");
        expect(fileTypeKind("")).toBe("other");
        expect(fileTypeKind(null)).toBe("other");
        expect(fileTypeKind(undefined)).toBe("other");
    });
});

describe("FileTypeIcon", () => {
    const svgOf = (container: HTMLElement) => container.querySelector("svg");

    // Every kind now draws inline in currentColor rather than fetching a
    // full-color asset, so the assertions are about the element and its ink,
    // not about a URL.
    it("draws every kind as an inline svg, never a fetched image", () => {
        for (const fileType of ["pdf", "deck.docx", "xlsx", "slides.pptx", null]) {
            const { container } = render(<FileTypeIcon fileType={fileType} />);
            expect(svgOf(container)).toBeInTheDocument();
            expect(container.querySelector("img")).toBeNull();
        }
    });

    it("gives each kind a distinct icon", () => {
        const pathsFor = (fileType: string | null) => {
            const { container } = render(<FileTypeIcon fileType={fileType} />);
            return [...container.querySelectorAll("path")]
                .map((node) => node.getAttribute("d"))
                .join("|");
        };
        const spreadsheet = pathsFor("xlsx");
        const presentation = pathsFor("pptx");
        const unknown = pathsFor(null);
        expect(new Set([spreadsheet, presentation, unknown]).size).toBe(3);
    });

    it("uses the faint ink by default", () => {
        const { container } = render(<FileTypeIcon fileType="pdf" />);
        expect(svgOf(container)).toHaveClass("text-ink-faint");
    });

    it("dims the icon in the muted state", () => {
        const { container } = render(<FileTypeIcon fileType="pdf" muted />);
        expect(svgOf(container)).toHaveClass("text-ink-faint/50");
    });

    it("always applies shrink-0 and merges a custom className", () => {
        const { container } = render(
            <FileTypeIcon fileType="pdf" className="h-6 w-6" />,
        );
        const svg = svgOf(container);
        expect(svg).toHaveClass("shrink-0");
        expect(svg).toHaveClass("h-6");
        expect(svg).toHaveClass("w-6");
    });
});
