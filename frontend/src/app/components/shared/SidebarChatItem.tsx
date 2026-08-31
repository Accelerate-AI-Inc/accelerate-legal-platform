"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Pencil, Trash2, Check, X } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import {
    MenuContent,
    MenuItem,
} from "@/app/components/ui/menu-surface";
import { useChatHistoryContext } from "@/app/contexts/ChatHistoryContext";
import { useAuth } from "@/app/contexts/AuthContext";
import { OwnerOnlyPopup } from "@/app/components/popups/OwnerOnlyPopup";
import type { Chat } from "@/app/components/shared/types";
import { AssistantIcon } from "@/app/components/shared/AppSidebarIcons";
import { cn } from "@/app/lib/utils";
import {
    SURFACE_SELECTED_CLASS,
    SURFACE_HOVER_CLASS,
    SURFACE_INSET_CLASS,
} from "@/app/components/ui/surface";

interface Props {
    chat: Chat;
    isActive: boolean;
    onSelect: () => void;
    projectName?: string;
}

export function SidebarChatItem({ chat, isActive, onSelect, projectName }: Props) {
    const { renameChat, deleteChat } = useChatHistoryContext();
    const { user } = useAuth();
    const [isRenaming, setIsRenaming] = useState(false);
    const [editTitle, setEditTitle] = useState(chat.title ?? "");
    const [ownerOnlyAction, setOwnerOnlyAction] = useState<string | null>(null);
    const editInputRef = useRef<HTMLInputElement>(null);
    // Sidebar can show collaborator chats from projects the user owns;
    // rename/delete are still creator-only on the backend, so guard here.
    const isChatOwner = !!user?.id && chat.user_id === user.id;

    useEffect(() => {
        if (isRenaming) editInputRef.current?.focus();
    }, [isRenaming]);

    const handleRenameSave = async () => {
        const trimmed = editTitle.trim();
        if (trimmed) await renameChat(chat.id, trimmed);
        setIsRenaming(false);
    };

    const handleRenameCancel = () => {
        setIsRenaming(false);
        setEditTitle(chat.title ?? "");
    };

    return (
        <div
            className={cn(
                "group relative flex h-8 w-full items-center rounded-sm transition-colors",
                isActive
                    ? `${SURFACE_SELECTED_CLASS} pr-1`
                    : `pr-3 ${SURFACE_HOVER_CLASS} hover:pr-1`,
            )}
        >
            {isRenaming ? (
                <div className="flex items-center w-full px-2 py-1">
                    <input
                        ref={editInputRef}
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") void handleRenameSave();
                            if (e.key === "Escape") handleRenameCancel();
                        }}
                        className={`flex-1 rounded px-1 py-0.5 text-sm ${SURFACE_INSET_CLASS} focus:outline-none focus:ring-1 focus:ring-accent`}
                    />
                    <button
                        onClick={() => void handleRenameSave()}
                        className="ml-1.5 py-2 hover:bg-surface-sunk rounded text-positive"
                    >
                        <Check className="h-3 w-3" />
                    </button>
                    <button
                        onClick={handleRenameCancel}
                        className="ml-1 py-2 hover:bg-surface-sunk rounded text-critical"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            ) : (
                <>
                    <AssistantIcon className="ml-2.5 h-3.5 w-3.5 shrink-0" />
                    <button
                        onClick={onSelect}
                        onMouseEnter={(e) => {
                            const el = e.currentTarget;
                            const overflow = el.scrollWidth - el.clientWidth;
                            if (overflow > 0) el.scrollTo({ left: overflow, behavior: "smooth" });
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.scrollTo({ left: 0, behavior: "smooth" });
                        }}
                        className={cn(
                            "min-w-0 flex-1 overflow-x-hidden whitespace-nowrap scrollbar-none py-1 pl-2 text-left text-xs",
                            isActive
                                ? "pr-3 text-ink"
                                : "pr-0 text-ink group-hover:pr-3",
                        )}
                        title={projectName ? `${projectName}: ${chat.title ?? "Untitled chat"}` : (chat.title ?? "Untitled chat")}
                    >
                        {projectName && (
                            <span className="text-ink-faint font-normal">{projectName}: </span>
                        )}
                        {chat.title ?? "Untitled chat"}
                    </button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className={`flex h-6 w-0 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-transparent text-ink-muted opacity-0 transition-opacity hover:text-ink ${
                                    isActive
                                        ? "w-6 opacity-100"
                                        : "pointer-events-none group-hover:w-6 group-hover:pointer-events-auto group-hover:opacity-100"
                                }`}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <MenuContent align="end" className="z-101">
                            <MenuItem
                                onClick={() => {
                                    if (!isChatOwner) {
                                        setOwnerOnlyAction("rename this chat");
                                        return;
                                    }
                                    setEditTitle(chat.title ?? "");
                                    setIsRenaming(true);
                                }}
                            >
                                <Pencil className="mr-2 h-4 w-4" />
                                Rename
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    if (!isChatOwner) {
                                        setOwnerOnlyAction("delete this chat");
                                        return;
                                    }
                                    void deleteChat(chat.id);
                                }}
                                className="text-critical focus:text-critical"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </MenuItem>
                        </MenuContent>
                    </DropdownMenu>
                </>
            )}
            <OwnerOnlyPopup
                open={!!ownerOnlyAction}
                action={ownerOnlyAction ?? undefined}
                onClose={() => setOwnerOnlyAction(null)}
            />
        </div>
    );
}
