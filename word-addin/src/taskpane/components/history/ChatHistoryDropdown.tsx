import React, { useState } from "react";
import { History, Search } from "lucide-react";
import type { Message } from "../../types";
import { LiquidIconButton } from "../primitives/LiquidActionRow";
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@ax/dropdown-ui";
import { ChatHistoryListView } from "./ChatHistoryList";
import { usePaginatedChats } from "../../hooks/usePaginatedChats";
import type { WordChatStorageMode } from "../../lib/wordChatSettings";
import type { ReasoningLevel } from "../../lib/wordChatTypes";

interface ChatHistoryDropdownProps {
  onSelect: (
    chatId: string,
    messages: Message[],
    model: string | null,
    reasoningLevel: ReasoningLevel | null,
  ) => void;
  documentId: string;
  storageMode: WordChatStorageMode;
  ownerId: string;
}

export function ChatHistoryDropdown({
  onSelect,
  documentId,
  ownerId,
  storageMode,
}: ChatHistoryDropdownProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  // The header is mounted with the Assistant page, so this preloads the first
  // ten rows before the user opens the dropdown.
  const pagination = usePaginatedChats(
    10,
    true,
    documentId,
    ownerId,
    storageMode
  );

  return (
    <Dropdown open={open} onOpenChange={setOpen}>
      <DropdownTrigger asChild>
        <LiquidIconButton aria-label="Chat history" title="Chat history">
          <History
            data-testid="chat-history-trigger-icon"
            className="h-4 w-4"
          />
        </LiquidIconButton>
      </DropdownTrigger>
      <DropdownContent
        align="end"
        sideOffset={8}
        className="h-[360px] max-h-[calc(100vh-4.5rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden p-2"
      >
        <label className="flex h-9 shrink-0 items-center gap-2 rounded-sm border border-rule/70 bg-surface/70 px-3 text-ink-faint">
          <Search className="h-3.5 w-3.5" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search recent chats..."
            className="min-w-0 flex-1 border-0 bg-transparent text-xs text-ink outline-none placeholder:text-ink-faint"
          />
        </label>
        <ChatHistoryListView
          pageSize={10}
          pagination={pagination}
          search={search}
          dateStyle="relative"
          onSelect={(chatId, messages, model, reasoningLevel) => {
            setOpen(false);
            onSelect(chatId, messages, model, reasoningLevel);
          }}
          className="mt-1 flex-1"
          titleClassName="font-normal"
          documentId={documentId}
          ownerId={ownerId}
          storageMode={storageMode}
        />
      </DropdownContent>
    </Dropdown>
  );
}
