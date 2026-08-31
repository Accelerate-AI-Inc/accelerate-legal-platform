import React, { useMemo } from "react";
import { Search } from "lucide-react";
import type { Workflow } from "../../types";
import { Spinner } from "../../../shared/ui/spinner";

interface WorkflowListProps {
  workflows: Workflow[];
  search: string;
  onSearchChange: (search: string) => void;
  onSelect: (workflow: Workflow) => void;
  loading?: boolean;
  error?: string | null;
  selectedId?: string;
  emptyMessage?: string;
}

export function WorkflowList({
  workflows,
  search,
  onSearchChange,
  onSelect,
  loading = false,
  error = null,
  selectedId,
  emptyMessage = "No assistant workflows found",
}: WorkflowListProps): React.ReactElement {
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return workflows;
    return workflows.filter((workflow) =>
      [workflow.metadata.title, workflow.metadata.practice ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [search, workflows]);

  return (
    <>
      <label className="flex h-9 shrink-0 items-center gap-2 rounded-sm border border-rule/70 bg-surface/70 px-3 text-ink-faint">
        <Search className="h-3.5 w-3.5" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search workflows..."
          className="min-w-0 flex-1 border-0 bg-transparent text-xs text-ink outline-none placeholder:text-ink-faint"
        />
      </label>
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-sm pb-3">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner label="Loading workflows…" />
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-faint">
            {search ? "No matches found" : emptyMessage}
          </p>
        ) : (
          <div className="space-y-px">
            {filtered.map((workflow) => {
              const isSelected = selectedId === workflow.id;
              const runnable = !!(workflow.skill_md ?? "").trim();
              return (
                <button
                  key={workflow.id}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={!runnable}
                  onClick={() => onSelect(workflow)}
                  className={`flex w-full min-w-0 items-center gap-3 rounded-sm px-3 py-2.5 text-left text-xs transition-all ${
                    isSelected
                      ? "bg-surface-sunk text-ink"
                      : "text-ink hover:bg-surface-sunk"
                  } ${runnable ? "" : "cursor-not-allowed opacity-45"}`}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {workflow.metadata.title}
                  </span>
                  {workflow.metadata.practice && (
                    <span className="max-w-[40%] shrink-0 truncate text-right text-[11px] text-ink-faint">
                      {workflow.metadata.practice}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
