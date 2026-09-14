import { Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { EventCol, EventKey, Rsvp, RsvpPatch } from "../types";
import { AttendMark, SideText } from "./GuestBits";
import { RowMenu } from "./RowMenu";
import { NoteField } from "./NoteField";

interface Props {
  rows: Rsvp[];
  events: readonly { key: EventKey; col: EventCol; label: string }[];
  onEdit: (r: Rsvp) => void;
  onPatch: (id: number, patch: RsvpPatch, label: string) => void;
}

export function GuestCards({ rows, events, onEdit, onPatch }: Props) {
  return (
    <ul className="grid gap-3">
      {rows.map((r) => (
        <li
          key={r.id}
          className={cn("rounded-lg border bg-card p-4", r.hidden && "border-dashed")}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="truncate font-display text-lg font-semibold">{r.name}</h3>
                {!!r.verified && (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                    Spoken to
                  </span>
                )}
                {!!r.hidden && (
                  <span className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
                    Hidden
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                <SideText side={r.side} />
                {r.whatsapp && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="tnum truncate">{r.whatsapp}</span>
                  </>
                )}
              </div>
            </div>
            <RowMenu r={r} onEdit={onEdit} onPatch={onPatch} />
          </div>

          {/* Answers as a plain divided list, not a bordered panel — a card
              inside a card reads as two competing objects. */}
          <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1.5 border-t pt-3">
            {events.map((e) => (
              <div key={e.key} className="flex items-baseline justify-between gap-2">
                <dt className="text-sm text-muted-foreground">{e.label}</dt>
                <dd>
                  <AttendMark r={r} event={e} layout="row" />
                </dd>
              </div>
            ))}
          </dl>

          {r.guest_count > 0 && (
            <p className="mt-3 flex items-start gap-1.5 text-sm text-muted-foreground">
              <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                <span className="font-medium text-foreground">+{r.guest_count}</span> with them
                {r.guest_names && <span> · {r.guest_names}</span>}
              </span>
            </p>
          )}

          <div className="mt-3">
            <NoteField row={r} onPatch={onPatch} className="h-11" placeholder="Add a note…" />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t pt-2">
            {/* py-3 gives the row a 44px touch target without a 44px-tall switch. */}
            <label
              htmlFor={`followed-up-${r.id}`}
              className="flex cursor-pointer items-center gap-2 py-3 text-sm text-muted-foreground"
            >
              <Switch
                id={`followed-up-${r.id}`}
                checked={!!r.verified}
                onCheckedChange={(c) =>
                  onPatch(
                    r.id,
                    { verified: c ? 1 : 0 },
                    c ? `Marked as spoken to — ${r.name}` : `Marked as not spoken to — ${r.name}`,
                  )
                }
                aria-label={`Spoken to ${r.name} about their reply`}
              />
              Spoken to
            </label>
            <span className="tnum shrink-0 text-xs text-muted-foreground">
              Replied{" "}
              {new Date(r.created_at).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
