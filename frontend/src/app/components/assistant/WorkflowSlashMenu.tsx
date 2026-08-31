"use client";

import { useEffect, useRef } from "react";
import type { Workflow } from "../shared/types";
import { workflowSlashCommand } from "./workflowSlashCommands";
import { SURFACE_VEIL_CLASS } from "@/app/components/ui/surface";

export const WORKFLOW_SLASH_MENU_ID = "workflow-slash-menu";

interface Props {
    workflows: Workflow[];
    activeIndex: number;
    onSelect: (workflow: Workflow) => void;
}

export function WorkflowSlashMenu({ workflows, activeIndex, onSelect }: Props) {
    const activeOptionRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        activeOptionRef.current?.scrollIntoView?.({ block: "nearest" });
    }, [activeIndex]);

    if (workflows.length === 0) return null;

    return (
        <div
            id={WORKFLOW_SLASH_MENU_ID}
            role="listbox"
            aria-label="Workflow commands"
            className={`absolute bottom-full left-0 mb-1.5 grid max-h-64 w-full gap-1 overflow-y-auto rounded-[18px] p-1 overscroll-contain md:rounded-[22px] ${SURFACE_VEIL_CLASS}`}
        >
            {workflows.map((workflow, index) => {
                const trigger = workflowSlashCommand(workflow);
                if (!trigger) return null;
                const active = index === activeIndex;
                return (
                    <button
                        ref={active ? activeOptionRef : undefined}
                        key={workflow.id}
                        id={`${WORKFLOW_SLASH_MENU_ID}-${index}`}
                        type="button"
                        role="option"
                        aria-label={`${trigger} ${workflow.metadata.title}`}
                        aria-selected={active}
                        onClick={() => onSelect(workflow)}
                        className={`theme-dropdown-item flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm transition-colors ${
                            active
                                ? "theme-dropdown-selected text-ink"
                                : "text-ink"
                        }`}
                    >
                        <span className="font-medium text-ink">
                            {trigger}
                        </span>
                        <span className="truncate text-ink-muted">
                            {workflow.metadata.title}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
