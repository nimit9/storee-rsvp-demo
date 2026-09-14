import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import type { Rsvp, RsvpPatch } from "../types";

interface Props {
  row: Rsvp;
  onPatch: (id: number, patch: RsvpPatch, label: string) => void;
  className?: string;
  placeholder?: string;
}

/**
 * A note that survives being interrupted. Blur alone is not enough on a phone:
 * switching apps mid-sentence fires no blur, so the text would be lost with no
 * sign anything went wrong. Enter and the page being backgrounded both commit.
 */
export function NoteField({ row, onPatch, className, placeholder = "Add note…" }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  // Kept in a ref so the visibilitychange listener always sees the current row
  // without re-subscribing on every keystroke.
  const latest = useRef({ row, onPatch });
  latest.current = { row, onPatch };

  function commit() {
    const el = ref.current;
    if (!el) return;
    const { row: r, onPatch: patch } = latest.current;
    const next = el.value;
    if (next === (r.note || "")) return;
    patch(r.id, { note: next }, `Note saved for ${r.name}`);
  }

  useEffect(() => {
    function onHide() {
      if (document.visibilityState === "hidden") commit();
    }
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  return (
    <Input
      ref={ref}
      defaultValue={row.note}
      placeholder={placeholder}
      aria-label={`Note about ${row.name}`}
      className={className}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
