export function workflowSlashCommandFromTitle(title: string): string | null {
    const titleSlug = title
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .trim()
        .replace(/[\s-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return titleSlug ? `/${titleSlug}` : null;
}

export function WorkflowSlashCommandUI({ title }: { title: string }) {
    const command = workflowSlashCommandFromTitle(title);

    return (
        <p className="mt-2 min-h-5 text-xs leading-5 text-ink-muted">
            {command ? (
                <>
                    Type{" "}
                    <span className="text-ink">
                        {command}
                    </span>{" "}
                    in chat to activate this workflow.
                </>
            ) : (
                <span aria-hidden="true">&nbsp;</span>
            )}
        </p>
    );
}
