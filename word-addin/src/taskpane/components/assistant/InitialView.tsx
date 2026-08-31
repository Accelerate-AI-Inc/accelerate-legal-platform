import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getUserProfile } from "../../api/accelerateApi";
import { BrandMark } from "../../../shared/chat/brand-mark";
import type { QuickAction } from "../../types";
import { useQuickActions } from "../../lib/quickActionStore";
import { quickActionDisplayName } from "../../lib/quickActions";
import { Zap } from "lucide-react";

const ICON_SIZE = 26;
const GREETING_GAP = 6;

export function InitialView({
  onSelect,
}: {
  onSelect: (action: QuickAction) => void;
}): React.ReactElement {
  const [name, setName] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [iconOffset, setIconOffset] = useState(0);
  const [textOffset, setTextOffset] = useState(0);
  const quickActions = useQuickActions();
  const textRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let cancelled = false;
    void getUserProfile()
      .then((profile) => {
        const displayName = profile.displayName?.trim();
        if (!cancelled) setName(displayName || "there");
      })
      .catch(() => {
        if (!cancelled) setName("there");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    if (!name || !textRef.current) return;
    setLoaded(false);
    const textWidth = textRef.current.offsetWidth;
    setIconOffset((textWidth + GREETING_GAP) / 2);
    setTextOffset((ICON_SIZE + GREETING_GAP) / 2);
  }, [name]);

  useEffect(() => {
    if (!name || !iconOffset) return;
    const timer = window.setTimeout(() => setLoaded(true), 100);
    return () => window.clearTimeout(timer);
  }, [iconOffset, name]);

  return (
    <div className="flex w-full flex-col items-center text-center">
      <div className="relative mb-8 h-10 w-full">
        {name && (
          <>
            <div
              data-testid="initial-brand-mark"
              className="absolute h-[26px] w-[26px]"
              style={{
                left: "50%",
                top: "50%",
                transform: loaded
                  ? `translate(calc(-50% - ${iconOffset}px), -50%)`
                  : "translate(-50%, -50%)",
                transition:
                  "transform 900ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              }}
            >
              <BrandMark size={ICON_SIZE} />
            </div>
            <h1
              ref={textRef}
              className="absolute whitespace-nowrap font-serif text-3xl font-light text-ink"
              style={{
                left: "50%",
                top: "50%",
                transform: loaded
                  ? `translate(calc(-50% + ${textOffset}px), -50%)`
                  : "translate(-50%, -50%)",
                opacity: loaded ? 1 : 0,
                transition:
                  "transform 900ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 800ms ease-in-out 300ms",
              }}
            >
              Hi, {name}
            </h1>
          </>
        )}
      </div>
      <div className="flex h-5 items-center justify-center">
        <span className="flex items-center gap-1.5 text-xs font-medium text-ink">
          <Zap
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-ink-faint"
          />
          Quick actions
        </span>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
        {quickActions
          .filter((action) => action.enabled)
          .map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => onSelect(action)}
              className="inline-flex h-8 items-center justify-center rounded-full border border-rule/70 bg-surface/55 px-3 font-medium text-ink-muted transition-all hover:bg-surface hover:text-ink active:scale-[0.98]"
            >
              {quickActionDisplayName(action)}
            </button>
          ))}
      </div>
    </div>
  );
}
