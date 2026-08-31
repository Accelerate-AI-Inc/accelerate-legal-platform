"use client";

import {
    useState,
    useEffect,
    useMemo,
    useCallback,
    useRef,
    type UIEvent,
} from "react";
import { PanelLeft, ChevronsUpDown, ChevronDown, Loader2 } from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";
import { useUserProfile } from "@/app/contexts/UserProfileContext";
import { useChatHistoryContext } from "@/app/contexts/ChatHistoryContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/app/components/chat/brand-mark";
import { SidebarChatItem } from "@/app/components/shared/SidebarChatItem";
import {
    AssistantIcon,
    MattersIcon,
    LibraryIcon,
    ReviewsIcon,
    WorkflowsIcon,
    ResourcesIcon,
    HistoryIcon,
    SettingsIcon,
    SignOutIcon,
} from "@/app/components/shared/AppSidebarIcons";
import { ProjectSvgIcon } from "@/app/components/shared/FolderSvgIcon";
import { listProjectSummaries } from "@/app/lib/accelerateApi";
import type { Project } from "@/app/components/shared/types";
import { cn } from "@/app/lib/utils";
import {
    SURFACE_CHROME_CLASS,
    SURFACE_SELECTED_CLASS,
    SURFACE_HOVER_CLASS,
    OVERLAY_SURFACE_CLASS,
} from "@/app/components/ui/surface";

/**
 * The rail is grouped rather than flat: "what am I working on" separates
 * cleanly from "what am I drawing on" and "what runs itself", and a flat list
 * of six gave the reader no such handle.
 *
 * Route paths are deliberately unchanged from before the relabel — "Matters"
 * is the profession's word for a project, but `/projects` stays the URL, the
 * table and the type name.
 */
type NavItem = {
    href: string;
    label: string;
    icon: typeof AssistantIcon;
    /** Exact-match only: these routes own deep children with their own nav. */
    exact?: boolean;
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
    {
        label: "Work",
        items: [
            { href: "/assistant", label: "Assistant", icon: AssistantIcon, exact: true },
            { href: "/projects", label: "Matters", icon: MattersIcon, exact: true },
            { href: "/tabular-reviews", label: "Reviews", icon: ReviewsIcon },
        ],
    },
    {
        label: "Knowledge",
        items: [
            { href: "/library", label: "Library", icon: LibraryIcon },
            { href: "/resources", label: "Resources", icon: ResourcesIcon },
        ],
    },
    {
        label: "Automate",
        items: [{ href: "/workflows", label: "Workflows", icon: WorkflowsIcon }],
    },
];

const RECENT_PROJECT_PAGE_SIZE = 10;
const RECENT_PROJECT_LIST_HEIGHT_CLASS = "h-44";
const recentProjectsCache = new Map<
    string,
    { projects: Project[]; hasMore: boolean }
>();

function isNearScrollEnd(element: HTMLDivElement) {
    return (
        element.scrollHeight - element.scrollTop - element.clientHeight <= 32
    );
}

interface AppSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
}

export function AppSidebar({ isOpen, onToggle }: AppSidebarProps) {
    const { user, signOut } = useAuth();
    const { profile } = useUserProfile();
    const { chats, loadingMoreChats, loadMoreChats, setCurrentChatId } =
        useChatHistoryContext();
    const router = useRouter();
    const pathname = usePathname();
    const routeChatId = useMemo(() => {
        if (pathname.startsWith("/assistant/chat/")) {
            return pathname.split("/").pop() ?? null;
        }

        const projectChatMatch = pathname.match(
            /^\/projects\/[^/]+\/assistant\/chat\/([^/]+)/,
        );
        return projectChatMatch?.[1] ?? null;
    }, [pathname]);
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [projectsCollapsed, setProjectsCollapsed] = useState(false);
    const [historyCollapsed, setHistoryCollapsed] = useState(false);
    const userId = user?.id ?? null;
    const [recentProjects, setRecentProjects] = useState<Project[] | null>(
        null,
    );
    const [hasMoreRecentProjects, setHasMoreRecentProjects] = useState(false);
    const [loadingMoreRecentProjects, setLoadingMoreRecentProjects] =
        useState(false);
    const loadingMoreRecentProjectsRef = useRef(false);
    const displayedRecentProjects =
        recentProjects ??
        (userId ? recentProjectsCache.get(userId)?.projects : undefined) ??
        null;

    useEffect(() => {
        if (!userId) {
            setRecentProjects([]);
            setHasMoreRecentProjects(false);
            setLoadingMoreRecentProjects(false);
            loadingMoreRecentProjectsRef.current = false;
            return;
        }

        const cached = recentProjectsCache.get(userId);
        if (cached) {
            setRecentProjects(cached.projects);
            setHasMoreRecentProjects(cached.hasMore);
        } else {
            setRecentProjects(null);
            setHasMoreRecentProjects(false);
        }
        const controller = new AbortController();
        setLoadingMoreRecentProjects(false);
        loadingMoreRecentProjectsRef.current = false;

        listProjectSummaries({
            limit: RECENT_PROJECT_PAGE_SIZE + 1,
            signal: controller.signal,
        })
            .then((projects) => {
                if (controller.signal.aborted) return;
                const next = projects.slice(0, RECENT_PROJECT_PAGE_SIZE);
                const hasMore = projects.length > RECENT_PROJECT_PAGE_SIZE;
                recentProjectsCache.set(userId, { projects: next, hasMore });
                setRecentProjects(next);
                setHasMoreRecentProjects(hasMore);
            })
            .catch(() => {
                if (controller.signal.aborted) return;
                setRecentProjects([]);
                setHasMoreRecentProjects(false);
            });

        return () => controller.abort();
    }, [userId]);

    const loadMoreRecentProjects = useCallback(async () => {
        if (
            !userId ||
            recentProjects === null ||
            !hasMoreRecentProjects ||
            loadingMoreRecentProjectsRef.current
        ) {
            return;
        }

        loadingMoreRecentProjectsRef.current = true;
        setLoadingMoreRecentProjects(true);
        try {
            const projects = await listProjectSummaries({
                limit: RECENT_PROJECT_PAGE_SIZE + 1,
                offset: recentProjects.length,
            });
            const page = projects.slice(0, RECENT_PROJECT_PAGE_SIZE);
            setRecentProjects((current) => {
                const existing = new Set(
                    (current ?? []).map((project) => project.id),
                );
                const next = [
                    ...(current ?? []),
                    ...page.filter((project) => !existing.has(project.id)),
                ];
                recentProjectsCache.set(userId, {
                    projects: next,
                    hasMore: projects.length > RECENT_PROJECT_PAGE_SIZE,
                });
                return next;
            });
            setHasMoreRecentProjects(
                projects.length > RECENT_PROJECT_PAGE_SIZE,
            );
        } catch {
            // Keep the current page and allow the next scroll to retry.
        } finally {
            loadingMoreRecentProjectsRef.current = false;
            setLoadingMoreRecentProjects(false);
        }
    }, [hasMoreRecentProjects, recentProjects, userId]);

    const handleRecentProjectsScroll = useCallback(
        (event: UIEvent<HTMLDivElement>) => {
            if (isNearScrollEnd(event.currentTarget)) {
                void loadMoreRecentProjects();
            }
        },
        [loadMoreRecentProjects],
    );

    const handleChatHistoryScroll = useCallback(
        (event: UIEvent<HTMLDivElement>) => {
            if (isNearScrollEnd(event.currentTarget)) {
                void loadMoreChats();
            }
        },
        [loadMoreChats],
    );

    const handleToggle = () => {
        if (isOpen) setShouldAnimate(true);
        onToggle();
    };

    useEffect(() => {
        const handleClickOutside = () => setIsDropdownOpen(false);
        if (isDropdownOpen) {
            document.addEventListener("click", handleClickOutside);
            return () =>
                document.removeEventListener("click", handleClickOutside);
        }
    }, [isDropdownOpen]);

    useEffect(() => {
        setCurrentChatId(routeChatId);
    }, [routeChatId, setCurrentChatId]);

    const getUserInitials = (email: string) => {
        if (profile?.displayName)
            return profile.displayName.charAt(0).toUpperCase();
        return email.charAt(0).toUpperCase();
    };

    const getDisplayName = () => {
        if (!profile) return "";
        return profile.displayName || user?.email?.split("@")[0] || "";
    };

    const getUserTier = () => {
        if (!profile) return "";
        return profile.tier || "Free";
    };

    if (!user) return null;

    return (
        <>
            {/* Mobile: tapping outside the expanded sidebar closes it. The
                sidebar (z-[99]) sits above this scrim (z-[98]); md+ is
                unaffected since the sidebar is part of the layout there. */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[98] bg-rule-strong/20 md:hidden"
                    onClick={handleToggle}
                    aria-hidden="true"
                />
            )}
            <div
                className={cn(
                    isOpen
                        ? "w-64 h-dvh"
                        : "max-md:hidden w-14 h-dvh pointer-events-none md:pointer-events-auto",
                    "overflow-visible rule-r",
                    SURFACE_CHROME_CLASS,
                    "flex flex-col transition-all duration-300 absolute md:relative z-[99]",
                )}
            >
                {/* Toggle + Logo */}
                <div
                    className={`items-center justify-between px-2.5 py-3 ${
                        !isOpen ? "hidden md:flex" : "flex"
                    }`}
                >
                    {isOpen && (
                        <div className="px-2">
                            <Link
                                href="/assistant"
                                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                            >
                                <BrandMark size={20} className="text-ink" />
                                <span
                                    className={`font-serif text-xl font-normal tracking-tight ${
                                        shouldAnimate ? "sidebar-fade-in" : ""
                                    }`}
                                >
                                    Accelerate
                                </span>
                            </Link>
                        </div>
                    )}
                    <button
                        onClick={handleToggle}
                        className={cn(
                            "h-9 w-9 p-2.5 items-center flex transition-colors",
                            "rounded-sm",
                            SURFACE_HOVER_CLASS,
                        )}
                        title={isOpen ? "Close sidebar" : "Open sidebar"}
                    >
                        <PanelLeft className="h-4 w-4" />
                    </button>
                </div>

                {/* Nav groups */}
                <nav aria-label="Main" className="flex flex-col">
                    {NAV_GROUPS.map((group, groupIndex) => (
                        <div
                            key={group.label}
                            className={groupIndex > 0 ? "mt-3" : ""}
                        >
                            {isOpen && (
                                <div
                                    className={`px-5 pb-1 text-eyebrow text-ink-faint ${
                                        shouldAnimate ? "sidebar-fade-in" : ""
                                    }`}
                                >
                                    {group.label}
                                </div>
                            )}
                            {group.items.map(({ href, label, icon: Icon, exact }) => {
                                const isActive = exact
                                    ? pathname === href
                                    : pathname === href ||
                                      pathname.startsWith(href + "/");
                                return (
                                    <div key={href} className="px-2.5 py-0.5">
                                        <button
                                            onClick={() => router.push(href)}
                                            title={!isOpen ? label : ""}
                                            aria-current={
                                                isActive ? "page" : undefined
                                            }
                                            className={cn(
                                                "h-9 w-full items-center gap-3 rounded-sm px-2.5 py-2 text-left transition-colors",
                                                isActive
                                                    ? `${SURFACE_SELECTED_CLASS} text-accent`
                                                    : `text-ink-muted hover:text-ink ${SURFACE_HOVER_CLASS}`,
                                                !isOpen ? "hidden md:flex" : "flex",
                                            )}
                                        >
                                            <Icon
                                                className="h-4 w-4 flex-shrink-0"
                                                aria-hidden="true"
                                            />
                                            {isOpen && (
                                                <span
                                                    className={`text-sm font-medium ${
                                                        shouldAnimate
                                                            ? "sidebar-fade-in-2"
                                                            : ""
                                                    }`}
                                                >
                                                    {label}
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {isOpen && (
                    <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
                        {/* Recent Projects */}
                        <div>
                            <button
                                onClick={() => setProjectsCollapsed((v) => !v)}
                                className={`mb-2 flex w-full items-center justify-between px-5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink ${
                                    shouldAnimate ? "sidebar-fade-in" : ""
                                }`}
                            >
                                <span>Recent Projects</span>
                                <ChevronDown
                                    className={`h-3.5 w-3.5 transition-transform ${
                                        projectsCollapsed ? "-rotate-90" : ""
                                    }`}
                                />
                            </button>
                            {!projectsCollapsed && (
                                <div
                                    className={cn(
                                        RECENT_PROJECT_LIST_HEIGHT_CLASS,
                                        "overflow-y-auto",
                                    )}
                                    onScroll={handleRecentProjectsScroll}
                                >
                                    {!displayedRecentProjects ? (
                                        <div className="space-y-1 px-2.5">
                                            {[50, 65, 45].map((w, i) => (
                                                <div
                                                    key={i}
                                                    className="flex h-8 items-center rounded-sm px-3"
                                                >
                                                    <div
                                                        className="h-3 bg-surface-sunk rounded animate-pulse"
                                                        style={{
                                                            width: `${w}%`,
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : displayedRecentProjects.length === 0 ? (
                                        <div
                                            className={`px-5 py-2 text-xs text-ink-muted ${
                                                shouldAnimate
                                                    ? "sidebar-fade-in-2"
                                                    : ""
                                            }`}
                                        >
                                            No projects yet
                                        </div>
                                    ) : (
                                        <div
                                            className={`space-y-1 px-2.5 pb-1 ${
                                                shouldAnimate
                                                    ? "sidebar-fade-in-2"
                                                    : ""
                                            }`}
                                        >
                                            {displayedRecentProjects.map(
                                                (project) => {
                                                    const isActive =
                                                        pathname ===
                                                            `/projects/${project.id}` ||
                                                        pathname.startsWith(
                                                            `/projects/${project.id}/`,
                                                        );
                                                    return (
                                                        <button
                                                            key={project.id}
                                                            onClick={() =>
                                                                router.push(
                                                                    `/projects/${project.id}`,
                                                                )
                                                            }
                                                            title={project.name}
                                                            className={cn(
                                                                "flex h-8 w-full items-center gap-2 rounded-sm px-2.5 py-1 text-left text-xs transition-colors",
                                                                isActive
                                                                    ? `${SURFACE_SELECTED_CLASS} text-ink`
                                                                    : `text-ink ${SURFACE_HOVER_CLASS}`,
                                                            )}
                                                        >
                                                            <ProjectSvgIcon
                                                                open={isActive}
                                                                className="h-3.5 w-3.5 shrink-0"
                                                            />
                                                            <span className="min-w-0 flex-1 truncate">
                                                                {project.name}
                                                            </span>
                                                        </button>
                                                    );
                                                },
                                            )}
                                            {loadingMoreRecentProjects && (
                                                <div className="flex h-8 items-center justify-center">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-faint" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Assistant History */}
                        <div
                            className={cn(
                                "flex min-h-0 flex-col",
                                !historyCollapsed && "flex-1",
                            )}
                        >
                            <button
                                onClick={() => setHistoryCollapsed((v) => !v)}
                                className={`mb-2 flex w-full items-center justify-between px-5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink ${
                                    shouldAnimate ? "sidebar-fade-in" : ""
                                }`}
                            >
                                <span>Assistant History</span>
                                <ChevronDown
                                    className={`h-3.5 w-3.5 transition-transform ${
                                        historyCollapsed ? "-rotate-90" : ""
                                    }`}
                                />
                            </button>
                            <div
                                className={cn(
                                    "min-h-0 flex-1 overflow-y-auto",
                                    historyCollapsed && "hidden",
                                )}
                                onScroll={handleChatHistoryScroll}
                            >
                                {!chats ? (
                                    <div className="space-y-1.5 px-2.5">
                                        {[40, 60, 50, 70, 45].map((w, i) => (
                                            <div
                                                key={i}
                                                className="flex h-8 items-center rounded-sm px-2.5"
                                            >
                                                <div className="mr-2 h-3.5 w-3.5 shrink-0 rounded bg-surface-sunk animate-pulse" />
                                                <div
                                                    className="h-3 bg-surface-sunk rounded animate-pulse"
                                                    style={{ width: `${w}%` }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : chats.length === 0 ? (
                                    <div
                                        className={`text-xs text-ink-muted py-2 px-5 ${
                                            shouldAnimate
                                                ? "sidebar-fade-in-2"
                                                : ""
                                        }`}
                                    >
                                        No chats yet
                                    </div>
                                ) : (
                                    <>
                                        <div
                                            className={`space-y-1.5 px-2.5 ${
                                                shouldAnimate
                                                    ? "sidebar-fade-in-2"
                                                    : ""
                                            }`}
                                        >
                                            {chats.map((chat) => (
                                                <SidebarChatItem
                                                    key={chat.id}
                                                    chat={chat}
                                                    isActive={
                                                        routeChatId === chat.id
                                                    }
                                                    projectName={
                                                        chat.project_name ??
                                                        undefined
                                                    }
                                                    onSelect={() => {
                                                        setCurrentChatId(
                                                            chat.id,
                                                        );
                                                        router.push(
                                                            chat.project_id
                                                                ? `/projects/${chat.project_id}/assistant/chat/${chat.id}`
                                                                : `/assistant/chat/${chat.id}`,
                                                        );
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        {loadingMoreChats && (
                                            <div className="flex h-8 items-center justify-center">
                                                <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-faint" />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* User Profile */}
                <div className="mt-auto p-1">
                    {user && (
                        <div className="relative">
                            <button
                                onClick={() =>
                                    setIsDropdownOpen(!isDropdownOpen)
                                }
                                className={cn(
                                    "flex w-full items-center rounded-sm px-2.5 py-3 transition-colors",
                                    !isOpen ? "hidden md:flex" : "",
                                    pathname.startsWith("/settings") ||
                                        pathname === "/history" ||
                                        isDropdownOpen
                                        ? SURFACE_SELECTED_CLASS
                                        : SURFACE_HOVER_CLASS,
                                )}
                                title={!isOpen ? user.email : undefined}
                            >
                                <div className="h-6.5 w-6.5 flex-shrink-0 rounded-full bg-ink flex items-center justify-center text-paper text-sm font-medium font-serif">
                                    {getUserInitials(user.email)}
                                </div>
                                {isOpen && (
                                    <div
                                        className={`text-left flex-1 min-w-0 pl-3 flex items-center justify-between gap-2 ${
                                            shouldAnimate
                                                ? "sidebar-fade-in-2"
                                                : ""
                                        }`}
                                    >
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <div className="text-sm font-medium text-ink leading-none">
                                                {getDisplayName()}
                                            </div>
                                            <div className="text-[12px] text-ink-muted leading-none">
                                                {getUserTier()}
                                            </div>
                                        </div>
                                        <ChevronsUpDown className="h-4 w-4 flex-shrink-0 text-ink-faint" />
                                    </div>
                                )}
                            </button>

                            {isDropdownOpen && (
                                <div
                                    className={cn(
                                        "absolute bottom-full left-0 z-50 mb-1 p-1 whitespace-nowrap",
                                        isOpen ? "right-0" : "w-56",
                                        OVERLAY_SURFACE_CLASS,
                                    )}
                                >
                                    <button
                                        onClick={() => {
                                            router.push("/history");
                                            setIsDropdownOpen(false);
                                        }}
                                        className={cn(
                                            "flex w-full items-center gap-2 rounded-sm px-4 py-2 text-left text-sm text-ink",
                                            SURFACE_HOVER_CLASS,
                                            pathname === "/history" &&
                                                SURFACE_SELECTED_CLASS,
                                        )}
                                    >
                                        <HistoryIcon className="h-4 w-4" aria-hidden="true" />
                                        History
                                    </button>
                                    <button
                                        onClick={() => {
                                            router.push("/settings");
                                            setIsDropdownOpen(false);
                                        }}
                                        className={cn(
                                            "w-full px-4 py-2 text-left text-sm text-ink flex items-center gap-2 rounded-sm",
                                            SURFACE_HOVER_CLASS,
                                        )}
                                    >
                                        <SettingsIcon className="h-4 w-4" aria-hidden="true" />
                                        Settings
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            void signOut()
                                                .then(() => router.push("/"))
                                                .catch(() => {
                                                    window.alert(
                                                        "Unable to sign out. Please try again.",
                                                    );
                                                });
                                        }}
                                        className={cn(
                                            "flex w-full items-center gap-2 rounded-sm px-4 py-2 text-left text-sm text-ink",
                                            SURFACE_HOVER_CLASS,
                                        )}
                                    >
                                        <SignOutIcon className="h-4 w-4" aria-hidden="true" />
                                        Sign out
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
