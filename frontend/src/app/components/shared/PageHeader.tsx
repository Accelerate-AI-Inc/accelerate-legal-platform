"use client";

import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Loader2, Plus, Search, X } from "lucide-react";
import { usePageChrome } from "@/app/contexts/PageChromeContext";
import { cn } from "@/app/lib/utils";
import {
    DropdownMenu,
    DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import {
    MenuContent,
    MenuItem,
} from "@/app/components/ui/menu-surface";
import {
    SURFACE_SELECTED_CLASS,
} from "@/app/components/ui/surface";
import {
    HeaderButtonUI,
    HeaderButtonsUI,
    headerButtonClassName,
} from "@/shared/ui/HeaderButtonsUI";

export interface PageHeaderBreadcrumb {
    label?: ReactNode;
    onClick?: () => void;
    cursor?: "text";
    loading?: boolean;
    skeletonClassName?: string;
    title?: string;
}

type PageHeaderButtonAction = {
    type?: never;
    icon?: ReactNode;
    label?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    title?: string;
    iconOnly?: boolean;
    tooltip?: ReactNode;
};

type PageHeaderSearchAction = {
    type: "search";
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
};

type PageHeaderNewAction = {
    type: "new";
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    title?: string;
};

type PageHeaderCustomAction = {
    type: "custom";
    render: ReactNode;
};

export type PageHeaderAction =
    | PageHeaderButtonAction
    | PageHeaderSearchAction
    | PageHeaderNewAction
    | PageHeaderCustomAction;

type MaybePageHeaderAction = PageHeaderAction | null | false | undefined;

type PageHeaderActionGroup =
    | MaybePageHeaderAction[]
    | {
          actions: MaybePageHeaderAction[];
      };

interface PageHeaderProps {
    /**
     * The page title. Pass the string; the masthead owns the display style so
     * it stays in one place. Use `breadcrumbs` for a nested page and
     * `children` only for a title that is not plain text.
     */
    title?: ReactNode;
    /** Small uppercase label above the title, naming the section. */
    eyebrow?: ReactNode;
    children?: ReactNode;
    actions?: MaybePageHeaderAction[];
    actionGroups?: PageHeaderActionGroup[];
    shrink?: boolean;
    breadcrumbs?: PageHeaderBreadcrumb[];
    loading?: boolean;
}

export function PageHeader({
    title,
    eyebrow,
    children,
    actions,
    actionGroups,
    shrink = false,
    breadcrumbs,
    loading = false,
}: PageHeaderProps) {
    const { mobileActionsContainer } = usePageChrome();
    const headerContent = breadcrumbs?.length ? (
        <PageHeaderBreadcrumbs items={breadcrumbs} />
    ) : title !== undefined ? (
        <h1 className="min-w-0 truncate font-serif text-3xl font-normal tracking-tight text-ink">
            {title}
        </h1>
    ) : (
        children
    );
    const actionsDisabled =
        loading || !!breadcrumbs?.some((item) => item.loading);
    const actionItems = actions?.filter(isPresentAction) ?? [];
    const groupedActionItems = (
        actionGroups
            ?.map(normalizeActionGroup)
            .filter((group) => group.actions.length > 0) ??
        (actionItems.length > 0 ? [{ actions: actionItems }] : [])
    );
    const hasActions = groupedActionItems.length > 0;

    return (
        <div
            className={cn(
                "mx-4 flex flex-col md:mx-8",
                shrink && "shrink-0",
            )}
        >
            {/* Masthead: eyebrow, display title, rule, then the actions row.
                A rule rather than a shadow is what separates the header from
                the content below it. */}
            {eyebrow ? (
                <div className="pt-5 text-eyebrow text-ink-faint">{eyebrow}</div>
            ) : null}
            <div
                className={cn(
                    "flex min-w-0 items-end pb-3",
                    eyebrow ? "pt-1" : "pt-5",
                )}
            >
                {headerContent}
            </div>
            <div className="rule-b-strong" />
            {hasActions && (
                <div className="hidden min-h-[44px] shrink-0 items-center justify-end gap-3 py-2 md:flex">
                    <PageHeaderActionGroups
                        groupedActionItems={groupedActionItems}
                        actionsDisabled={actionsDisabled}
                    />
                </div>
            )}
            {hasActions &&
                mobileActionsContainer &&
                createPortal(
                    <div className="flex min-w-0 items-center justify-end gap-3 overflow-visible py-2 -my-2">
                        <PageHeaderActionGroups
                            groupedActionItems={groupedActionItems}
                            actionsDisabled={actionsDisabled}
                        />
                    </div>,
                    mobileActionsContainer,
                )}
        </div>
    );
}

function PageHeaderActionGroups({
    groupedActionItems,
    actionsDisabled,
}: {
    groupedActionItems: {
        actions: PageHeaderAction[];
    }[];
    actionsDisabled: boolean;
}) {
    return (
        <>
            {groupedActionItems.map((group, groupIndex) => (
                <HeaderButtonsUI key={groupIndex}>
                    {group.actions.map((action, index) => (
                        <PageHeaderActionRenderer
                            key={index}
                            action={action}
                            disabled={actionsDisabled}
                        />
                    ))}
                </HeaderButtonsUI>
            ))}
        </>
    );
}

function normalizeActionGroup(group: PageHeaderActionGroup) {
    if (Array.isArray(group)) {
        return {
            actions: group.filter(isPresentAction),
        };
    }
    return {
        actions: group.actions.filter(isPresentAction),
    };
}

function isPresentAction(action: MaybePageHeaderAction): action is PageHeaderAction {
    return Boolean(action);
}

function PageHeaderActionRenderer({
    action,
    disabled,
}: {
    action: PageHeaderAction;
    disabled: boolean;
}) {
    switch (action.type) {
        case "search":
            return (
                <PageHeaderSearchActionControl
                    action={action}
                    disabled={disabled}
                />
            );
        case "new":
            return (
                <PageHeaderNewActionControl
                    action={action}
                    disabled={disabled}
                />
            );
        case "custom":
            return (
                <span
                    className={cn(
                        "inline-flex h-7 items-center",
                        disabled && "pointer-events-none opacity-40",
                    )}
                >
                    {action.render}
                </span>
            );
        default:
            return (
                <PageHeaderButtonActionControl
                    action={action}
                    disabled={disabled}
                />
            );
    }
}

function PageHeaderButtonActionControl({
    action,
    disabled,
}: {
    action: PageHeaderButtonAction;
    disabled: boolean;
}) {
    const iconOnly = action.iconOnly ?? !action.label;
    return (
        <div className={action.tooltip ? "relative group" : undefined}>
            <HeaderButtonUI
                onClick={action.onClick}
                disabled={disabled || action.disabled}
                title={action.title}
                aria-label={action.title}
                iconOnly={iconOnly}
            >
                {action.icon}
                {action.label}
            </HeaderButtonUI>
            {action.tooltip && (
                <div className="pointer-events-none absolute right-0 top-full mt-1.5 z-10 hidden items-center whitespace-nowrap rounded-sm bg-ink px-2.5 py-1.5 text-xs text-paper group-hover:flex">
                    {action.tooltip}
                </div>
            )}
        </div>
    );
}

function PageHeaderNewActionControl({
    action,
    disabled,
}: {
    action: PageHeaderNewAction;
    disabled: boolean;
}) {
    const title = action.title ?? "New";
    return (
        <HeaderButtonUI
            onClick={action.onClick}
            disabled={disabled || action.disabled || action.loading}
            title={title}
            aria-label={title}
            iconOnly
        >
            {action.loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Plus className="h-4 w-4" />
            )}
        </HeaderButtonUI>
    );
}

function PageHeaderSearchActionControl({
    action,
    disabled,
}: {
    action: PageHeaderSearchAction;
    disabled: boolean;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const placeholder = action.placeholder ?? "Search…";
    const hasValue = action.value.length > 0;
    const expanded = open || hasValue;

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    return (
        <div ref={ref} className="relative flex items-center">
            {expanded ? (
                <div
                    className={cn(
                        headerButtonClassName({
                            className:
                                "cursor-text justify-start gap-2 px-3 text-ink hover:text-ink",
                        }),
                        `w-56 sm:w-80 ${SURFACE_SELECTED_CLASS}`,
                    )}
                >
                    <Search className="h-3.5 w-3.5 text-ink-faint shrink-0" />
                    <input
                        autoFocus={open}
                        type="text"
                        placeholder={placeholder}
                        value={action.value}
                        onChange={(e) => action.onChange(e.target.value)}
                        onFocus={() => setOpen(true)}
                        className="flex-1 text-sm text-ink placeholder:text-ink-faint outline-none bg-transparent"
                    />
                    {hasValue && (
                        <button
                            type="button"
                            onClick={() => {
                                action.onChange("");
                                setOpen(false);
                            }}
                            disabled={disabled}
                            aria-label="Clear search"
                            className="shrink-0 rounded-full p-0.5 text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink-muted"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            ) : (
                <HeaderButtonUI
                    onClick={() => setOpen(true)}
                    disabled={disabled}
                    iconOnly
                    title={placeholder}
                    aria-label={placeholder}
                >
                    <Search className="h-4 w-4" />
                </HeaderButtonUI>
            )}
        </div>
    );
}

function PageHeaderBreadcrumbs({ items }: { items: PageHeaderBreadcrumb[] }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const measurementRefs = useRef<Array<HTMLSpanElement | null>>([]);
    const ellipsisMeasurementRef = useRef<HTMLSpanElement>(null);
    const [visibleIndices, setVisibleIndices] = useState<number[]>(() =>
        items.map((_, index) => index),
    );
    const parent = [...items]
        .slice(0, -1)
        .reverse()
        .find((item) => item.onClick);

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const measure = () => {
            if (!window.matchMedia("(min-width: 640px)").matches) {
                setVisibleIndices(items.map((_, index) => index));
                return;
            }

            const availableWidth = container.clientWidth;
            const widths = items.map(
                (_, index) =>
                    measurementRefs.current[index]?.getBoundingClientRect()
                        .width ?? 0,
            );
            const ellipsisWidth =
                ellipsisMeasurementRef.current?.getBoundingClientRect().width ??
                32;
            const plans = breadcrumbVisibilityPlans(items.length);
            const next =
                plans.find(
                    (plan) =>
                        breadcrumbPlanWidth(
                            plan,
                            widths,
                            ellipsisWidth,
                        ) <= availableWidth,
                ) ?? [Math.max(0, items.length - 1)];
            setVisibleIndices((current) =>
                current.length === next.length &&
                current.every((value, index) => value === next[index])
                    ? current
                    : next,
            );
        };

        const frame = requestAnimationFrame(measure);
        if (typeof ResizeObserver === "undefined") {
            return () => cancelAnimationFrame(frame);
        }
        const observer = new ResizeObserver(measure);
        observer.observe(container);
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, [items]);

    const entries = collapsedBreadcrumbEntries(items, visibleIndices);

    return (
        <div
            ref={containerRef}
            className="relative flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-2xl font-medium font-serif"
        >
            {parent?.onClick && (
                <button
                    onClick={parent.onClick}
                    className="shrink-0 text-ink-faint transition-colors hover:text-ink-muted sm:hidden"
                    title={parent.title ?? "Back"}
                    aria-label={parent.title ?? "Back"}
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
            )}
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                {entries.map((entry) =>
                    entry.type === "item" ? (
                        <BreadcrumbItem
                            key={`item-${entry.index}`}
                            item={entry.item}
                            current={entry.index === items.length - 1}
                        />
                    ) : (
                        <CollapsedBreadcrumbGroup
                            key={`collapsed-${entry.startIndex}`}
                            items={entry.items}
                        />
                    ),
                )}
            </div>
            <div
                aria-hidden
                className="pointer-events-none invisible absolute flex w-max items-center gap-1.5"
            >
                {items.map((item, index) => (
                    <span
                        key={index}
                        ref={(element) => {
                            measurementRefs.current[index] = element;
                        }}
                        className="flex"
                    >
                        <BreadcrumbItem
                            item={item}
                            current={index === items.length - 1}
                        />
                    </span>
                ))}
                <span
                    ref={ellipsisMeasurementRef}
                    className="hidden shrink-0 items-center gap-1.5 sm:flex"
                >
                    <span>…</span>
                    <span className="text-ink-faint">›</span>
                </span>
            </div>
        </div>
    );
}

function breadcrumbVisibilityPlans(itemCount: number): number[][] {
    if (itemCount <= 1) return [[0].filter((index) => index < itemCount)];
    const current = itemCount - 1;
    const candidates = [
        Array.from({ length: itemCount }, (_, index) => index),
        [0, 1, 2, current - 2, current - 1, current],
        [0, 1, current - 1, current],
        [1, current - 1, current],
        [current - 1, current],
        [current],
    ];
    const seen = new Set<string>();
    return candidates.flatMap((candidate) => {
        const plan = [...new Set(candidate)]
            .filter((index) => index >= 0 && index < itemCount)
            .sort((a, b) => a - b);
        if (!plan.includes(current)) plan.push(current);
        const key = plan.join(",");
        if (seen.has(key)) return [];
        seen.add(key);
        return [plan];
    });
}

function breadcrumbPlanWidth(
    visibleIndices: number[],
    itemWidths: number[],
    ellipsisWidth: number,
) {
    const visible = new Set(visibleIndices);
    let entryCount = visibleIndices.length;
    let hiddenGroupCount = 0;
    let insideHiddenGroup = false;
    for (let index = 0; index < itemWidths.length; index += 1) {
        if (visible.has(index)) {
            insideHiddenGroup = false;
        } else if (!insideHiddenGroup) {
            hiddenGroupCount += 1;
            entryCount += 1;
            insideHiddenGroup = true;
        }
    }
    const visibleWidth = visibleIndices.reduce(
        (total, index) => total + (itemWidths[index] ?? 0),
        0,
    );
    return (
        visibleWidth +
        hiddenGroupCount * ellipsisWidth +
        Math.max(0, entryCount - 1) * 6
    );
}

type CollapsedBreadcrumbEntry =
    | {
          type: "item";
          index: number;
          item: PageHeaderBreadcrumb;
      }
    | {
          type: "collapsed";
          startIndex: number;
          items: PageHeaderBreadcrumb[];
      };

function collapsedBreadcrumbEntries(
    items: PageHeaderBreadcrumb[],
    visibleIndices: number[],
): CollapsedBreadcrumbEntry[] {
    const visible = new Set(visibleIndices);
    visible.add(items.length - 1);
    const entries: CollapsedBreadcrumbEntry[] = [];
    let index = 0;
    while (index < items.length) {
        if (visible.has(index)) {
            entries.push({ type: "item", index, item: items[index] });
            index += 1;
            continue;
        }
        const startIndex = index;
        const collapsed: PageHeaderBreadcrumb[] = [];
        while (index < items.length && !visible.has(index)) {
            collapsed.push(items[index]);
            index += 1;
        }
        entries.push({ type: "collapsed", startIndex, items: collapsed });
    }
    return entries;
}

function CollapsedBreadcrumbGroup({
    items,
}: {
    items: PageHeaderBreadcrumb[];
}) {
    return (
        <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="text-ink-muted transition-colors hover:text-ink"
                        aria-label="Show collapsed breadcrumbs"
                        title="Show path"
                    >
                        …
                    </button>
                </DropdownMenuTrigger>
                <MenuContent
                    align="start"
                    className="z-[150] min-w-44 p-1 font-sans"
                >
                    {items.map((item, index) => (
                        <MenuItem
                            key={index}
                            disabled={!item.onClick}
                            onSelect={item.onClick}
                            className="max-w-72 truncate"
                            title={
                                item.title ??
                                (typeof item.label === "string"
                                    ? item.label
                                    : undefined)
                            }
                        >
                            {item.label}
                        </MenuItem>
                    ))}
                </MenuContent>
            </DropdownMenu>
            <span className="text-ink-faint">›</span>
        </span>
    );
}

function BreadcrumbItem({
    item,
    current,
}: {
    item: PageHeaderBreadcrumb;
    current: boolean;
}) {
    const content = item.loading ? (
        <div
            className={cn(
                "h-6 rounded bg-surface-sunk animate-pulse",
                item.skeletonClassName ?? "w-32",
            )}
        />
    ) : (
        <>
            <span
                className={cn(
                    "truncate",
                    item.cursor === "text" && "cursor-text",
                )}
            >
                {item.label}
            </span>
        </>
    );

    const className = cn(
        "min-w-0 truncate transition-colors",
        item.cursor === "text" && "cursor-text",
        current
            ? cn(
                  "text-ink",
                  item.onClick && "cursor-pointer hover:text-ink-muted",
              )
            : item.onClick
              ? "text-ink-muted hover:text-ink"
              : "text-ink-muted",
    );
    const wrapperClassName = cn(
        "min-w-0 items-center gap-1.5",
        current
            ? "flex min-w-[4rem] flex-1 overflow-hidden"
            : "hidden max-w-56 shrink-0 sm:flex",
    );

    return (
        <span className={wrapperClassName}>
            {current && !item.onClick ? (
                <span
                    className={cn(className, "block w-full")}
                    title={
                        item.title ??
                        (typeof item.label === "string"
                            ? item.label
                            : undefined)
                    }
                >
                    {content}
                </span>
            ) : item.onClick ? (
                <button
                    type="button"
                    onClick={item.onClick}
                    className={cn(
                        className,
                        current && "block w-full truncate text-left",
                    )}
                    title={
                        item.title ??
                        (typeof item.label === "string"
                            ? item.label
                            : undefined)
                    }
                >
                    {content}
                </button>
            ) : (
                <span className={className}>{content}</span>
            )}
            {!current && <span className="shrink-0 text-ink-faint">›</span>}
        </span>
    );
}
