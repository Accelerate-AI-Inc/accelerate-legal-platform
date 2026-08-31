"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";
import { settingsTabButtonClassName } from "./settingsStyles";

interface TabDef {
    id: string;
    label: string;
    href: string;
}

/**
 * Nine destinations is too many for one undifferentiated list. Grouping them
 * the way the app rail is grouped gives the reader somewhere to look: who I am,
 * what answers me, and what is held about me.
 */
const TAB_GROUPS: { label: string; tabs: TabDef[] }[] = [
    {
        label: "Profile",
        tabs: [
            { id: "account", label: "Account", href: "/settings" },
            {
                id: "personalisation",
                label: "Personalisation",
                href: "/settings/personalisation",
            },
            { id: "appearance", label: "Appearance", href: "/settings/appearance" },
            { id: "features", label: "Features", href: "/settings/features" },
        ],
    },
    {
        label: "Models",
        tabs: [
            { id: "models", label: "Model Preferences", href: "/settings/models" },
            { id: "byok", label: "Bring Your Own Keys", href: "/settings/byok" },
            { id: "connectors", label: "Connectors", href: "/settings/connectors" },
        ],
    },
    {
        label: "Security & Data",
        tabs: [
            { id: "security", label: "Security", href: "/settings/security" },
            {
                id: "privacy-data",
                label: "Privacy & Data",
                href: "/settings/privacy-data",
            },
        ],
    },
];

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/");
        }
    }, [isAuthenticated, authLoading, router]);

    if (authLoading) {
        return (
            <div className="h-dvh flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="flex h-full flex-col overflow-y-auto">
            <header className="mx-auto w-full max-w-5xl shrink-0 px-6 pt-8 pb-4">
                <div className="text-eyebrow text-ink-faint">Account</div>
                <h1 className="mt-1 font-serif text-4xl font-normal tracking-tight text-ink">
                    Settings
                </h1>
                <div className="mt-4 rule-b-strong" />
            </header>

            <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-10 pt-4 md:pt-6">
                <div className="grid grid-cols-1 gap-y-6 md:grid-cols-[224px_minmax(0,1fr)] md:gap-x-10">
                    <nav
                        aria-label="Settings"
                        className="z-10 -ml-3 min-w-0 self-start md:sticky md:top-4"
                    >
                        <div className="-m-1 min-w-0 p-1">
                            <div className="-m-1 min-w-0 overflow-x-auto overflow-y-hidden p-1">
                                <div className="mb-0 flex gap-4 md:flex-col md:gap-5">
                                    {TAB_GROUPS.map((group) => (
                                        <div key={group.label}>
                                            <div className="hidden px-3 pb-1 text-eyebrow text-ink-faint md:block">
                                                {group.label}
                                            </div>
                                            <ul className="flex gap-1 md:flex-col">
                                                {group.tabs.map((tab) => {
                                                    const active =
                                                        pathname === tab.href ||
                                                        (tab.href !==
                                                            "/settings" &&
                                                            pathname.startsWith(
                                                                tab.href,
                                                            ));
                                                    return (
                                                        <li key={tab.id}>
                                                            <button
                                                                type="button"
                                                                aria-current={
                                                                    active
                                                                        ? "page"
                                                                        : undefined
                                                                }
                                                                onClick={() =>
                                                                    router.push(
                                                                        tab.href,
                                                                    )
                                                                }
                                                                className={settingsTabButtonClassName(
                                                                    active,
                                                                )}
                                                            >
                                                                {tab.label}
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </nav>

                    <div className="min-w-0 outline-none">{children}</div>
                </div>
            </main>
        </div>
    );
}
