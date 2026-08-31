export function ContextNumberBadge({
    number,
    label,
}: {
    number: number | undefined;
    label: string;
}) {
    if (number === undefined) return null;

    return (
        <span
            aria-label={`${label} ${number}`}
            title={`${label} ${number}`}
            className="mt-0.5 inline-flex h-4 w-4 shrink-0 self-start items-center justify-center rounded-full bg-surface-sunk text-[9px] font-medium leading-none text-ink-muted"
        >
            {number}
        </span>
    );
}
