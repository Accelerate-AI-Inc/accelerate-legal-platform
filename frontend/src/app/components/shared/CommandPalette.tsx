"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Loader2, Search } from "lucide-react";
import {
    AssistantIcon,
    HistoryIcon,
    LibraryIcon,
    MattersIcon,
    ResourcesIcon,
    ReviewsIcon,
    SettingsIcon,
    WorkflowsIcon,
} from "@/app/components/shared/AppSidebarIcons";
import {
    OVERLAY_SURFACE_CLASS,
    SURFACE_SELECTED_CLASS,
} from "@/app/components/ui/surface";
import {
    listLegalResources,
    listWorkflows,
    searchLibraryDocuments,
    searchProjectDirectory,
} from "@/app/lib/accelerateApi";

const SEARCH_DEBOUNCE_MS = 180;
const RESULTS_PER_GROUP = 5;

interface Command {
    id: string;
    label: string;
    /** Shown after the label, e.g. the matter a document belongs to. */
    detail?: string;
    group: string;
    icon: ReactNode;
    run: () => void;
}

const NAV_TARGETS: { label: string; href: string; icon: ReactNode }[] = [
    { label: "Assistant", href: "/assistant", icon: <AssistantIcon className="h-4 w-4" /> },
    { label: "Matters", href: "/projects", icon: <MattersIcon className="h-4 w-4" /> },
    { label: "Reviews", href: "/tabular-reviews", icon: <ReviewsIcon className="h-4 w-4" /> },
    { label: "Library", href: "/library", icon: <LibraryIcon className="h-4 w-4" /> },
    { label: "Resources", href: "/resources", icon: <ResourcesIcon className="h-4 w-4" /> },
    { label: "Workflows", href: "/workflows", icon: <WorkflowsIcon className="h-4 w-4" /> },
    { label: "History", href: "/history", icon: <HistoryIcon className="h-4 w-4" /> },
    { label: "Settings", href: "/settings", icon: <SettingsIcon className="h-4 w-4" /> },
];

function matchesQuery(value: string, query: string): boolean {
    return value.toLowerCase().includes(query.toLowerCase());
}

/**
 * Cross-entity jump-to. The app has per-page search but nothing that reaches
 * across matters, documents, workflows and the resources catalog at once, which
 * is what a practitioner working from a name rather than a location needs.
 *
 * Every result is a route the rail could also reach — the palette is a faster
 * path to the same places, never a privileged one.
 */
export function CommandPalette() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [debounced, setDebounced] = useState("");
    // Results are stored with the query they answer, so "still searching" is a
    // comparison rather than a second piece of state kept in step by an effect.
    const [remote, setRemote] = useState<{ query: string; commands: Command[] }>(
        { query: "", commands: [] },
    );
    const [requestedIndex, setRequestedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const requestId = useRef(0);

    // Closing clears the query in the same update that closes the palette,
    // rather than in an effect that watches `open` — one render, and reopening
    // never flashes the previous search.
    const close = useCallback(() => {
        setOpen(false);
        setQuery("");
        setDebounced("");
        setRemote({ query: "", commands: [] });
        setRequestedIndex(0);
    }, []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (
                (event.metaKey || event.ctrlKey) &&
                event.key.toLowerCase() === "k"
            ) {
                event.preventDefault();
                if (open) close();
                else setOpen(true);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, close]);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    useEffect(() => {
        const timer = window.setTimeout(
            () => setDebounced(query.trim()),
            SEARCH_DEBOUNCE_MS,
        );
        return () => window.clearTimeout(timer);
    }, [query]);

    const go = useCallback(
        (href: string) => {
            close();
            router.push(href);
        },
        [close, router],
    );

    // Remote lookups run together and fail independently: one unavailable
    // surface must not blank out the others.
    useEffect(() => {
        // Below two characters there is nothing to look up; stale results are
        // ignored by the query comparison rather than cleared here.
        if (!open || debounced.length < 2) return;
        const id = ++requestId.current;

        void Promise.allSettled([
            searchProjectDirectory({ search: debounced, limit: RESULTS_PER_GROUP }),
            searchLibraryDocuments("files", {
                search: debounced,
                limit: RESULTS_PER_GROUP,
            }),
            listWorkflows(),
            listLegalResources({ search: debounced, limit: RESULTS_PER_GROUP }),
        ]).then(([projects, documents, workflows, resources]) => {
            if (id !== requestId.current) return;
            const results: Command[] = [];

            if (projects.status === "fulfilled") {
                for (const project of projects.value.slice(0, RESULTS_PER_GROUP)) {
                    results.push({
                        id: `project:${project.id}`,
                        label: project.name,
                        group: "Matters",
                        icon: <MattersIcon className="h-4 w-4" />,
                        run: () => go(`/projects/${project.id}`),
                    });
                }
            }
            if (documents.status === "fulfilled") {
                for (const document of documents.value.documents.slice(
                    0,
                    RESULTS_PER_GROUP,
                )) {
                    results.push({
                        id: `document:${document.id}`,
                        label: document.filename,
                        group: "Documents",
                        icon: <LibraryIcon className="h-4 w-4" />,
                        run: () => go("/library"),
                    });
                }
            }
            if (workflows.status === "fulfilled") {
                const matched = workflows.value
                    .filter((workflow) =>
                        matchesQuery(workflow.metadata.title, debounced),
                    )
                    .slice(0, RESULTS_PER_GROUP);
                for (const workflow of matched) {
                    results.push({
                        id: `workflow:${workflow.id}`,
                        label: workflow.metadata.title,
                        group: "Workflows",
                        icon: <WorkflowsIcon className="h-4 w-4" />,
                        run: () =>
                            go(
                                `/workflows/${workflow.metadata.type === "tabular" ? "tabular-review" : "assistant"}/${workflow.id}`,
                            ),
                    });
                }
            }
            if (resources.status === "fulfilled") {
                for (const resource of resources.value.resources.slice(
                    0,
                    RESULTS_PER_GROUP,
                )) {
                    results.push({
                        id: `resource:${resource.slug}`,
                        label: resource.name,
                        detail: resource.category,
                        group: "Resources",
                        icon: <ResourcesIcon className="h-4 w-4" />,
                        run: () => go("/resources"),
                    });
                }
            }

            setRemote({ query: debounced, commands: results });
        });
    }, [open, debounced, go]);

    const commands = useMemo(() => {
        const navigation: Command[] = NAV_TARGETS.filter(
            (target) => !query.trim() || matchesQuery(target.label, query.trim()),
        ).map((target) => ({
            id: `nav:${target.href}`,
            label: target.label,
            group: "Go to",
            icon: target.icon,
            run: () => go(target.href),
        }));
        const answered = remote.query === debounced ? remote.commands : [];
        return [...navigation, ...answered];
    }, [query, debounced, remote, go]);

    // Clamped rather than reset in an effect: when the result set shrinks the
    // highlight has to stay in range, and deriving it avoids a second render.
    const searching =
        debounced.length >= 2 && remote.query !== debounced;

    const activeIndex =
        commands.length === 0
            ? 0
            : Math.min(requestedIndex, commands.length - 1);

    const grouped = useMemo(() => {
        const groups: { label: string; items: { command: Command; index: number }[] }[] =
            [];
        commands.forEach((command, index) => {
            const existing = groups.find((group) => group.label === command.group);
            if (existing) existing.items.push({ command, index });
            else groups.push({ label: command.group, items: [{ command, index }] });
        });
        return groups;
    }, [commands]);

    if (!open || typeof document === "undefined") return null;

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "Escape") {
            event.preventDefault();
            close();
        } else if (event.key === "ArrowDown") {
            event.preventDefault();
            setRequestedIndex(
                (activeIndex + 1) % Math.max(commands.length, 1),
            );
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setRequestedIndex(
                (activeIndex - 1 + Math.max(commands.length, 1)) %
                    Math.max(commands.length, 1),
            );
        } else if (event.key === "Enter") {
            event.preventDefault();
            commands[activeIndex]?.run();
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[300] flex items-start justify-center bg-ink/20 px-4 pt-[12vh]"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) close();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Command palette"
                className={`flex max-h-[60vh] w-full max-w-xl flex-col overflow-hidden ${OVERLAY_SURFACE_CLASS}`}
                onKeyDown={onKeyDown}
            >
                <div className="flex items-center gap-2 rule-b px-3 py-2.5">
                    <Search
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-ink-faint"
                    />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search matters, documents, workflows, resources…"
                        aria-label="Search"
                        className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
                    />
                    {searching && (
                        <Loader2
                            aria-hidden="true"
                            className="h-3.5 w-3.5 shrink-0 animate-spin text-ink-faint"
                        />
                    )}
                    <span className="shrink-0 text-eyebrow text-ink-faint">esc</span>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto py-1">
                    {commands.length === 0 ? (
                        <p className="px-3 py-6 text-center text-xs text-ink-faint">
                            {debounced.length < 2
                                ? "Type at least two characters to search."
                                : "Nothing found."}
                        </p>
                    ) : (
                        grouped.map((group) => (
                            <div key={group.label} className="pb-1">
                                <div className="px-3 pt-2 pb-1 text-eyebrow text-ink-faint">
                                    {group.label}
                                </div>
                                {group.items.map(({ command, index }) => (
                                    <button
                                        key={command.id}
                                        type="button"
                                        // Not a listbox: each row is a command
                                        // the user runs, so a button is the
                                        // honest element and Enter/click agree.
                                        aria-current={
                                            index === activeIndex ? "true" : undefined
                                        }
                                        onMouseEnter={() => setRequestedIndex(index)}
                                        onClick={command.run}
                                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                                            index === activeIndex
                                                ? `${SURFACE_SELECTED_CLASS} text-ink`
                                                : "text-ink-muted"
                                        }`}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="shrink-0 text-ink-faint"
                                        >
                                            {command.icon}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate">
                                            {command.label}
                                        </span>
                                        {command.detail && (
                                            <span className="shrink-0 text-eyebrow text-ink-faint">
                                                {command.detail}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
