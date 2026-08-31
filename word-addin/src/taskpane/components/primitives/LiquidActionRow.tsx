import React from "react";
import { cn } from "../../../shared/lib/utils";

export function LiquidActionRow({
  children,
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border border-rule/70 bg-surface px-1 py-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function LiquidIconButton({
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button">): React.ReactElement {
  return (
    <button
      type={type}
      className={cn(
        "flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-sunk hover:text-ink active:bg-surface-sunk disabled:cursor-default disabled:text-ink-faint",
        className
      )}
      {...props}
    />
  );
}

export function LiquidTextButton({
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button">): React.ReactElement {
  return (
    <button
      type={type}
      className={cn(
        "flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-sunk hover:text-ink active:bg-surface-sunk disabled:cursor-default disabled:text-ink-faint",
        className
      )}
      {...props}
    />
  );
}
