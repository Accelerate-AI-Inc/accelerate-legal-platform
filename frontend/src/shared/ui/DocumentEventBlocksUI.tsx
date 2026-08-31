import type { ReactNode } from "react";

type EventDotColor = "green" | "gray" | "red";

function EventConnector() {
    return (
        <div className="absolute left-[3px] top-[14px] h-[calc(100%+10px)] w-[1px] -translate-x-1/2 bg-rule-strong" />
    );
}

function DocumentEventBlockUI({
    children,
    showConnector,
    isStreaming,
    dotColor = "green",
}: {
    children: ReactNode;
    showConnector?: boolean;
    isStreaming?: boolean;
    dotColor?: EventDotColor;
}) {
    const dotColorClass =
        dotColor === "green"
            ? "bg-positive"
            : dotColor === "red"
              ? "bg-critical"
              : "bg-ink-faint";

    return (
        <div className="relative flex items-start font-serif text-sm text-ink-muted">
            {showConnector && <EventConnector />}
            {isStreaming ? (
                <div className="mt-2 h-1.5 w-1.5 shrink-0 animate-spin rounded-full border border-rule-strong border-t-transparent" />
            ) : (
                <div
                    className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dotColorClass}`}
                />
            )}
            <div className="ml-2 min-w-0 flex-1 whitespace-normal break-words">
                {children}
            </div>
        </div>
    );
}

export function DocReadBlockUI({
    filename,
    fileIcon,
    onClick,
    showConnector,
    isStreaming,
}: {
    filename?: string;
    fileIcon?: ReactNode;
    onClick?: () => void;
    showConnector?: boolean;
    isStreaming?: boolean;
}) {
    const file = filename ? (
        <>
            {fileIcon}
            <span className="truncate">
                {filename}
                {isStreaming && "..."}
            </span>
        </>
    ) : isStreaming ? (
        <span>...</span>
    ) : null;

    return (
        <DocumentEventBlockUI
            showConnector={showConnector}
            isStreaming={isStreaming}
            dotColor="green"
        >
            <div className="flex min-w-0 items-center gap-1.5">
                <span className="shrink-0 font-medium">
                    {isStreaming ? "Reading" : "Read"}
                </span>
                {!isStreaming && onClick ? (
                    <button
                        type="button"
                        onClick={onClick}
                        className="flex min-w-0 cursor-pointer items-center gap-1.5 text-left transition-colors hover:text-ink"
                    >
                        {file}
                    </button>
                ) : (
                    <span className="flex min-w-0 items-center gap-1.5">
                        {file}
                    </span>
                )}
            </div>
        </DocumentEventBlockUI>
    );
}

export function DocFindBlockUI({
    filename,
    query,
    totalMatches,
    isStreaming,
    showConnector,
    onClick,
}: {
    filename: string;
    query: string;
    totalMatches: number;
    isStreaming?: boolean;
    showConnector?: boolean;
    onClick?: () => void;
}) {
    const matchSuffix = isStreaming
        ? ""
        : ` (${totalMatches} ${totalMatches === 1 ? "match" : "matches"})`;

    return (
        <DocumentEventBlockUI
            showConnector={showConnector}
            isStreaming={isStreaming}
            dotColor={totalMatches > 0 ? "green" : "gray"}
        >
            <span className="font-medium">
                {isStreaming ? "Finding" : "Found"}
            </span>{" "}
            <span>
                &ldquo;{query}&rdquo;{matchSuffix}
                <span className="ml-1 text-ink-faint">in </span>
                {!isStreaming && onClick ? (
                    <button
                        type="button"
                        onClick={onClick}
                        className="cursor-pointer text-left text-ink-faint transition-colors hover:text-ink"
                    >
                        {filename}
                    </button>
                ) : (
                    <span className="text-ink-faint">{filename}</span>
                )}
                {isStreaming && "..."}
            </span>
        </DocumentEventBlockUI>
    );
}

export function DocEditBlockUI({
    label,
    filename,
    detail,
    onClick,
    showConnector,
    isStreaming,
    dotColor = "green",
    labelTone = "default",
}: {
    label: string;
    filename?: string;
    detail?: ReactNode;
    onClick?: () => void;
    showConnector?: boolean;
    isStreaming?: boolean;
    dotColor?: EventDotColor;
    labelTone?: "default" | "error";
}) {
    return (
        <DocumentEventBlockUI
            showConnector={showConnector}
            isStreaming={isStreaming}
            dotColor={dotColor}
        >
            <span
                className={`font-medium ${labelTone === "error" ? "text-critical" : ""}`}
            >
                {label}
            </span>
            {filename && (
                <>
                    {" "}
                    {!isStreaming && onClick ? (
                        <button
                            type="button"
                            onClick={onClick}
                            className="cursor-pointer text-left transition-colors hover:text-ink"
                        >
                            {filename}
                        </button>
                    ) : (
                        <span>{isStreaming ? `${filename}...` : filename}</span>
                    )}
                </>
            )}
            {detail && <span className="ml-1 text-ink-faint">{detail}</span>}
        </DocumentEventBlockUI>
    );
}
