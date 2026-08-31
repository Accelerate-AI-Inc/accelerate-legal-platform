import { CircleAlert } from "lucide-react";
import type { Citation, DocumentCitationQuote } from "../../shared/types";
import { PillButton } from "../../ui/pill-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../ui/popover";

export type CitationVerificationDisplayState = "verified" | "unverified";

type VerificationPresentation = {
  label: string;
  description: string;
  pillClassName: string;
};

const UNVERIFIED_PRESENTATION: VerificationPresentation = {
  label: "Could not verify quote",
  description: "Quote could not be matched to the source text.",
  pillClassName:
    "!bg-critical-wash/85 !text-critical hover:!bg-critical-wash/80 hover:!text-critical dark:!bg-critical-wash dark:!text-paper dark:hover:!bg-critical-wash dark:hover:!text-paper",
};

export function citationVerificationState(
  citation: Citation,
): CitationVerificationDisplayState {
  return citation.verified === false ? "unverified" : "verified";
}

export function quoteVerificationState(
  quote: Pick<DocumentCitationQuote, "verification">,
): CitationVerificationDisplayState {
  return quote.verification?.verified === false ? "unverified" : "verified";
}

export function citationVerificationPillClassName(citation: Citation): string {
  return citationVerificationState(citation) === "unverified"
    ? UNVERIFIED_PRESENTATION.pillClassName
    : "";
}

export function citationVerificationDescription(
  citation: Citation,
): string | null {
  const state = citationVerificationState(citation);
  return state === "unverified" ? UNVERIFIED_PRESENTATION.description : null;
}

export function citationVerificationAriaLabel(citation: Citation): string {
  const state = citationVerificationState(citation);
  const suffix =
    state === "unverified" ? `. ${UNVERIFIED_PRESENTATION.label}` : "";
  return `Citation ${citation.ref}${suffix}`;
}

export function CitationVerificationBadge({
  state,
}: {
  state: CitationVerificationDisplayState;
}) {
  if (state !== "unverified") return null;

  const presentation = UNVERIFIED_PRESENTATION;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <PillButton
          tone="paper"
          size="sm"
          className="h-6 w-fit gap-1 px-1.5 font-sans text-[10px] !text-critical hover:!text-critical"
        >
          <CircleAlert className="h-3 w-3" aria-hidden="true" />
          {presentation.label}
        </PillButton>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="z-[220] w-72"
      >
        <span className="block text-xs font-medium text-ink">
          Quote not found in document
        </span>
        <span className="mt-1 block text-xs font-normal leading-5 text-ink-muted">
          The language model produced a quote that could not be found in the
          source document. Treat it as hallucinated and double-check the
          related section of the assistant response against the document
          before relying on it.
        </span>
      </PopoverContent>
    </Popover>
  );
}
