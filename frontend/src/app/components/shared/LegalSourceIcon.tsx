import { Gavel, Scale } from "lucide-react";

/**
 * Icons for the two kinds of external legal source the research surface shows.
 *
 * Line icons in `currentColor`, replacing the two gradient SVG assets these
 * call sites used to fetch through `next/image`. A gavel reads as case law and
 * scales as legislation, and both follow the surrounding ink.
 */
export function LegalSourceIcon({
    kind,
    className = "h-3.5 w-3.5",
}: {
    kind: "case" | "legislation";
    className?: string;
}) {
    const Icon = kind === "case" ? Gavel : Scale;
    return (
        <Icon
            aria-hidden="true"
            className={`${className} shrink-0 text-ink-faint`}
        />
    );
}
