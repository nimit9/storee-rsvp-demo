import { Check, X } from "lucide-react";
import { invitedTo, type EventKey, type Rsvp } from "../types";

// Quiet attendance marks — a colored glyph, not a pill. Keeps rows calm and
// avoids "status-chip soup" when four of these repeat on every row.
//
// Four states, not three. A blank answer from someone who was invited ("hasn't
// replied") and a blank from someone who was never asked ("not invited") look
// nothing alike here, because reading the second as a refusal is how a
// Reception-only guest turns into three no-shows on a caterer's sheet.
export function AttendMark({
  r,
  event,
  layout = "cell",
}: {
  r: Rsvp;
  event: { key: EventKey; label: string };
  /** "cell" is the dense table (glyphs + a tinted cell). "row" is a card, where there's room for words. */
  layout?: "cell" | "row";
}) {
  const invited = invitedTo(r, event.key);
  const v = r[`attend_${event.key}` as const];

  if (!invited) {
    // No faint glyph here: a dimmed character can't reach 4.5:1 and stay faint.
    // The table tints the whole cell instead (decoration, so no contrast floor)
    // and the card just says it.
    return layout === "row" ? (
      <span className="text-sm text-muted-foreground">Not invited</span>
    ) : (
      <span className="sr-only">Not invited to the {event.label}</span>
    );
  }
  if (v === "" && layout === "row") {
    return <span className="text-sm text-muted-foreground">No reply</span>;
  }
  if (v === "Yes") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden /> Yes
      </span>
    );
  }
  if (v === "No") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <X className="h-3.5 w-3.5" aria-hidden /> No
      </span>
    );
  }
  return (
    <span className="text-sm text-muted-foreground" title={`No reply yet about the ${event.label}`}>
      —<span className="sr-only">No reply yet about the {event.label}</span>
    </span>
  );
}

// Read once, above the table, so nobody has to infer what the marks mean. The
// card layout spells both states out in words and doesn't need this.
export function AttendLegend({ className }: { className?: string }) {
  return (
    <p className={className}>
      <span className="text-muted-foreground">—</span> they haven’t replied about that event yet
      <span aria-hidden> · </span>
      <span className="rounded-sm bg-muted-foreground/15 px-1.5 py-0.5">shaded</span> that event
      wasn’t on their invitation
    </p>
  );
}

export function SideText({ side }: { side: string }) {
  if (!side) return <span className="text-muted-foreground">Not given</span>;
  return <span className="text-sm text-foreground">{side}</span>;
}
