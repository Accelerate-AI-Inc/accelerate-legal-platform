export function AuthDividerUI() {
    return (
        <div className="flex items-center gap-3 py-1" aria-hidden="true">
            <div className="h-px flex-1 bg-surface-sunk" />
            <span className="text-xs text-ink-faint">or</span>
            <div className="h-px flex-1 bg-surface-sunk" />
        </div>
    );
}
