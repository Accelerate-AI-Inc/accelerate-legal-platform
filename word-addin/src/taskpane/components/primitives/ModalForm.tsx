import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../../shared/lib/utils";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from "@ax/dropdown-ui";

export function ModalFieldLabel({
  className,
  ...props
}: React.ComponentProps<"label">): React.ReactElement {
  return (
    <label
      className={cn("mb-2 block text-xs font-medium text-ink", className)}
      {...props}
    />
  );
}

export const ModalTextInput = forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & { variant?: "glass" | "minimal" }
>(function ModalTextInput(
  { className, variant = "glass", ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        variant === "minimal"
          ? "w-full bg-transparent font-serif text-2xl text-ink outline-none placeholder:text-ink-faint disabled:cursor-not-allowed disabled:text-ink-faint"
          : "h-10 w-full rounded-sm border border-rule/70 bg-surface px-3 text-sm text-ink outline-none placeholder:text-ink-faint transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
});

export const ModalTextArea = forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(function ModalTextArea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full resize-none rounded-sm border border-rule/70 bg-surface px-3 py-2.5 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-faint disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
});

export function ModalSelect({
  id,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "Select…",
  className,
}: {
  id: string;
  value: string;
  options: readonly (string | { value: string; label: string })[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}): React.ReactElement {
  const normalizedOptions = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  );
  const selectedLabel = normalizedOptions.find(
    (option) => option.value === value,
  )?.label;

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-sm border border-rule/70 bg-surface/55 px-3 text-sm text-ink transition-colors hover:bg-surface/70 focus:bg-surface/70 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60",
            className
          )}
        >
          <span className={cn("truncate", !value && "text-ink-faint")}>
            {selectedLabel || placeholder}
          </span>
          <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 text-ink-faint" />
        </button>
      </DropdownTrigger>
      <DropdownContent
        align="start"
        sideOffset={4}
        collisionPadding={12}
        onEscapeKeyDown={(event) => {
          // These selects live inside Modal, which closes on any Escape it
          // sees on `window`. Radix's dismissable layer hears the key first
          // (document-level capture runs before the event bubbles back out
          // to window), so stopping propagation here scopes the first
          // Escape to closing just the dropdown instead of discarding the
          // whole form. A second Escape, with the dropdown gone, reaches
          // the Modal and closes it as before.
          event.stopPropagation();
        }}
        className="max-h-56 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto"
      >
        {normalizedOptions.map((option) => (
          <DropdownItem
            key={option.value}
            textValue={option.label}
            selected={option.value === value}
            onSelect={() => onChange(option.value)}
            className="text-xs"
          >
            <span className="truncate">{option.label}</span>
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}
