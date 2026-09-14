import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff, MessageCircle, MoreHorizontal, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { waLink, type Rsvp, type RsvpPatch } from "../types";

/**
 * The row actions menu, positioned by hand.
 *
 * This was a Radix DropdownMenu and would not open. Radix positions its content
 * through floating-ui, whose first measurement is scheduled on
 * requestAnimationFrame; when that never runs the panel stays parked at its
 * pre-measurement `translate(0px, -200%)`, mounted and correct but 230px above
 * the viewport — open, and invisible. Radix's Select survives in the same page
 * because its item-aligned path doesn't depend on that.
 *
 * So: measure the button once at open time and render into a portal at fixed
 * coordinates. No floating-ui, no observers, no scroll lock, and no clipping by
 * the table's overflow-x-auto wrapper (which a plain absolute panel would hit,
 * since a non-visible overflow-x forces overflow-y to compute the same way).
 */

const PANEL_WIDTH = 224; // w-56
const GAP = 4;
const MARGIN = 8;

interface Props {
  r: Rsvp;
  onEdit: (r: Rsvp) => void;
  onPatch: (id: number, patch: RsvpPatch, label: string) => void;
}

export function RowMenu({ r, onEdit, onPatch }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wa = waLink(r.whatsapp);

  // Measured synchronously after mount so the panel never paints in the wrong
  // place, and only once per open — nothing watches for movement.
  useLayoutEffect(() => {
    if (!open) return;
    const btn = triggerRef.current;
    const panel = panelRef.current;
    if (!btn) return;
    const b = btn.getBoundingClientRect();
    const height = panel?.offsetHeight ?? 0;
    const below = window.innerHeight - b.bottom;
    // Flip above the button when there isn't room under it.
    const top = below < height + GAP + MARGIN ? b.top - height - GAP : b.bottom + GAP;
    const left = Math.min(
      Math.max(MARGIN, b.right - PANEL_WIDTH),
      window.innerWidth - PANEL_WIDTH - MARGIN,
    );
    setPos({ top: Math.max(MARGIN, top), left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onOutside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close();
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onOutside, true);
    // The panel is fixed to a one-time measurement, so close rather than let it
    // drift away from its row.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onOutside, true);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // Move focus into the panel so keyboard users aren't stranded on the trigger.
  useEffect(() => {
    if (open && pos) panelRef.current?.querySelector<HTMLElement>("[data-menu-item]")?.focus();
  }, [open, pos]);

  function choose(fn: () => void) {
    setOpen(false);
    fn();
  }

  const itemClass =
    "flex w-full items-center gap-2 rounded-sm px-2 py-2.5 text-left text-sm outline-none " +
    "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent " +
    "focus-visible:text-accent-foreground disabled:pointer-events-none disabled:opacity-50";

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        className="h-11 w-11 sm:h-8 sm:w-8"
        aria-label={`Actions for ${r.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </Button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            aria-label={`Actions for ${r.name}`}
            className={cn(
              "fixed z-50 w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
              // Hidden until measured, so it can't flash at the wrong spot.
              pos ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0 }}
          >
            <button
              type="button"
              role="menuitem"
              data-menu-item
              className={itemClass}
              onClick={() => choose(() => onEdit(r))}
            >
              <Pencil className="h-4 w-4" aria-hidden /> Edit details
            </button>

            {wa ? (
              <a
                role="menuitem"
                data-menu-item
                href={wa}
                target="_blank"
                rel="noreferrer"
                className={itemClass}
                onClick={() => setOpen(false)}
              >
                <MessageCircle className="h-4 w-4" aria-hidden /> Message on WhatsApp
              </a>
            ) : (
              // Say why it's unavailable rather than silently showing one item fewer.
              <button type="button" role="menuitem" className={itemClass} disabled>
                <MessageCircle className="h-4 w-4" aria-hidden /> No usable phone number
              </button>
            )}

            <div className="my-1 h-px bg-border" role="separator" />

            <button
              type="button"
              role="menuitem"
              data-menu-item
              className={itemClass}
              onClick={() =>
                choose(() =>
                  onPatch(
                    r.id,
                    { hidden: r.hidden ? 0 : 1 },
                    r.hidden ? `${r.name} is back in the list` : `${r.name} hidden from the list`,
                  ),
                )
              }
            >
              {r.hidden ? (
                <Eye className="h-4 w-4" aria-hidden />
              ) : (
                <EyeOff className="h-4 w-4" aria-hidden />
              )}
              {r.hidden ? "Put back in the list" : "Hide from the list"}
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
