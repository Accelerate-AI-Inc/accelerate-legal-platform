import React from "react";
import { cn } from "../../../shared/lib/utils";

type ComposerButtonProps = React.ComponentProps<"button"> & {
  active?: boolean;
};

/**
 * Compact composer action adapted from the frontend's document and workflow
 * controls. It stays label-free in the narrow Word pane while retaining a
 * descriptive tooltip and accessible name.
 */
export function ComposerButton({
  active = false,
  className,
  type = "button",
  ...props
}: ComposerButtonProps): React.ReactElement {
  return (
    <button
      type={type}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-sm px-2 text-sm transition-colors",
        active
          ? "text-ink hover:text-ink"
          : "text-ink-faint hover:text-ink",
        className
      )}
      {...props}
    />
  );
}
