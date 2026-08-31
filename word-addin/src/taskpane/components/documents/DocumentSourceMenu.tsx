import React from "react";
import { Loader2, Plus, Waypoints } from "lucide-react";
import { ComposerButton } from "../primitives/ComposerButton";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from "@ax/dropdown-ui";
import { Globe, Monitor } from "lucide-react";

interface DocumentSourceMenuProps {
  attachedCount: number;
  disabled?: boolean;
  uploading?: boolean;
  onLocalFiles: () => void;
  onWebFiles: () => void;
  onWorkflows: () => void;
}

export function DocumentSourceMenu({
  attachedCount,
  disabled = false,
  uploading = false,
  onLocalFiles,
  onWebFiles,
  onWorkflows,
}: DocumentSourceMenuProps): React.ReactElement {
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <ComposerButton
          disabled={disabled || uploading}
          active={attachedCount > 0}
          aria-label="Add documents"
          title="Add documents"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : attachedCount > 0 ? (
            <span className="font-medium tabular-nums">{attachedCount}</span>
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </ComposerButton>
      </DropdownTrigger>
      <DropdownContent
        side="top"
        align="start"
        sideOffset={8}
        collisionPadding={12}
        className="min-w-36"
      >
        <DropdownItem onSelect={onLocalFiles}>
          <Monitor
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-ink-faint"
          />
          Desktop Files
        </DropdownItem>
        <DropdownItem onSelect={onWebFiles}>
          <Globe
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-ink-faint"
          />
          Web files
        </DropdownItem>
        <DropdownItem onSelect={onWorkflows}>
          <Waypoints className="h-4 w-4 shrink-0 text-ink-muted" />
          Workflows
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
