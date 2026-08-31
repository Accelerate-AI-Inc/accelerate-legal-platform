"use client";

import { ExternalLink, FileText, Database, Globe } from "lucide-react";
import { IconButton } from "@/app/components/ui/icon-button";
import { SIDE_PANEL_SURFACE_CLASS } from "@/app/components/ui/surface";
import type { LegalResourceSummary } from "@/app/lib/accelerateApi";
import { resourceKindLabel } from "./resourceFacets";

/** One labelled metadata row. Eyebrow label, plain value — no pill badges. */
function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rule-t py-3">
            <div className="text-eyebrow text-ink-faint">{label}</div>
            <div className="mt-1 text-sm text-ink">{children}</div>
        </div>
    );
}

function LinkRow({
    icon,
    label,
    href,
}: {
    icon: React.ReactNode;
    label: string;
    href: string;
}) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="group flex items-center gap-2 py-1.5 text-sm text-accent hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
            <span aria-hidden="true" className="text-ink-faint">
                {icon}
            </span>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <ExternalLink
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            />
        </a>
    );
}

/**
 * Detail view for one catalog entry, following the shape of the document side
 * panel: a fixed-width right-hand column on desktop, full width below it.
 */
export function ResourceDetailPanel({
    resource,
    onClose,
}: {
    resource: LegalResourceSummary;
    onClose: () => void;
}) {
    const links = [
        resource.dataset_url
            ? {
                  icon: <Database className="h-4 w-4" />,
                  label: "Dataset",
                  href: resource.dataset_url,
              }
            : null,
        resource.paper_url
            ? {
                  icon: <FileText className="h-4 w-4" />,
                  label: "Paper",
                  href: resource.paper_url,
              }
            : null,
        resource.site_url
            ? {
                  icon: <Globe className="h-4 w-4" />,
                  label: resource.name,
                  href: resource.site_url,
              }
            : null,
    ].filter((link): link is NonNullable<typeof link> => link !== null);

    return (
        <aside
            aria-label={`${resource.name} details`}
            className={`flex w-full shrink-0 flex-col overflow-y-auto p-5 md:w-[360px] ${SIDE_PANEL_SURFACE_CLASS}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-eyebrow text-ink-faint">
                        {resourceKindLabel(resource.kind)} · {resource.category}
                    </div>
                    <h2 className="mt-1 font-serif text-2xl leading-tight text-ink">
                        {resource.name}
                    </h2>
                </div>
                <IconButton aria-label="Close details" onClick={onClose}>
                    <span aria-hidden="true" className="text-base leading-none">
                        &times;
                    </span>
                </IconButton>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                {resource.description}
            </p>

            <div className="mt-5">
                {links.length > 0 && (
                    <div className="rule-t py-3">
                        <div className="text-eyebrow text-ink-faint">Links</div>
                        <div className="mt-1">
                            {links.map((link) => (
                                <LinkRow key={link.href} {...link} />
                            ))}
                        </div>
                    </div>
                )}
                {resource.languages.length > 0 && (
                    <Field label="Language">
                        {resource.languages.join(", ")}
                    </Field>
                )}
                {resource.jurisdictions.length > 0 && (
                    <Field label="Jurisdiction">
                        {resource.jurisdictions.join(", ")}
                    </Field>
                )}
            </div>
        </aside>
    );
}
