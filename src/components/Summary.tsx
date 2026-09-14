import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import {
  hasReplied,
  heads,
  isAttending,
  plusOnes,
  totalHeads,
  type EventCol,
  type Rsvp,
} from "../types";

interface Props {
  /** The rows currently shown. These are the numbers that must match the export. */
  rows: Rsvp[];
  /** Plain-language description of what's being counted, e.g. "Sangeet · Family". */
  scopeLabel: string;
  /** True when filters are narrowing the list, so the scope line earns emphasis. */
  filtered: boolean;
  /** The events worth showing for the current view. */
  events: readonly { key: string; col: EventCol; label: string; date: string }[];
}

/**
 * Columns to use on a narrow screen: the largest count that divides the events
 * evenly without stranding one on a row of its own. 1→1, 2→2, 3→3, 4→2×2.
 */
function narrowColumns(count: number): number {
  if (count <= 3) return Math.max(1, count);
  for (const cols of [3, 2]) {
    if (count % cols === 0) return cols;
  }
  return 2;
}

export function Summary({ rows, scopeLabel, filtered, events }: Props) {
  const live = rows.filter((r) => !r.hidden);
  const attending = live.filter(isAttending);
  const declined = live.filter((r) => hasReplied(r) && !isAttending(r)).length;
  const awaiting = live.filter((r) => !hasReplied(r)).length;

  return (
    <section aria-labelledby="headcount-heading" className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b px-5 py-3">
        <h2 id="headcount-heading" className="text-sm font-medium">
          How many are coming
        </h2>
        <p className={filtered ? "text-xs font-medium text-primary" : "text-xs text-muted-foreground"}>
          {scopeLabel}
        </p>
      </div>

      {/* Column count follows the view: four events consolidated, one when
          looking at the Reception-only link. Set as CSS vars because Tailwind
          can't generate a class from a runtime number.
          Narrow screens get their own count so no row is ever left half-empty:
          a hard grid-cols-2 stranded Reception alone in the 3-event view. */}
      <dl
        className={cn(
          "grid [grid-template-columns:repeat(var(--event-cols-narrow),minmax(0,1fr))]",
          "sm:[grid-template-columns:repeat(var(--event-cols),minmax(0,1fr))]",
          // Dividers only where the grid is a single row; on a wrapped narrow
          // grid a border between every child lands inside rows, not between.
          "sm:[&>*+*]:border-l",
        )}
        style={
          {
            "--event-cols": events.length,
            "--event-cols-narrow": narrowColumns(events.length),
          } as CSSProperties
        }
      >
        {events.map((e) => {
          const people = heads(rows, e.col);
          const saidYes = live.filter((r) => r[e.col] === "Yes").length;
          const bringing = people - saidYes;
          return (
            <div key={e.key} className="px-5 py-4">
              <dt className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{e.label}</span>
                <span className="text-xs text-muted-foreground">{e.date}</span>
              </dt>
              <dd className="mt-2 flex items-baseline gap-1.5">
                <span className="font-display text-3xl leading-none font-semibold tnum">
                  {people}
                </span>
                <span className="text-sm text-muted-foreground">
                  {people === 1 ? "person" : "people"}
                </span>
              </dd>
              {/* Show the arithmetic instead of naming a unit. "5 guests + 7
                  they're bringing" needs no glossary; "12 heads" does. */}
              <p className="mt-1 text-xs text-muted-foreground">
                {people === 0
                  ? "nobody yet"
                  : bringing > 0
                    ? `${saidYes} ${saidYes === 1 ? "guest" : "guests"} + ${bringing} they’re bringing`
                    : `${saidYes} ${saidYes === 1 ? "guest" : "guests"}, coming on their own`}
              </p>
            </div>
          );
        })}
      </dl>

      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t px-5 py-3 text-sm text-muted-foreground">
        <span>
          <span className="font-medium text-foreground tnum">{totalHeads(rows)}</span> people in
          total
        </span>
        <span>
          <span className="font-medium text-foreground tnum">{attending.length}</span> guests said
          yes
        </span>
        <span>
          <span className="font-medium text-foreground tnum">{plusOnes(rows)}</span> extra guests
        </span>
        {declined > 0 && (
          <span>
            <span className="font-medium text-foreground tnum">{declined}</span> can’t come
          </span>
        )}
        {awaiting > 0 && (
          <span>
            <span className="font-medium text-foreground tnum">{awaiting}</span> haven’t replied
          </span>
        )}
      </div>

      <p className="border-t px-5 py-3 text-xs text-muted-foreground">
        Every number here counts extra guests too. Rows you’ve hidden are left out. Only guests who
        opened their link show up, so this isn’t a count of everyone you invited.
      </p>
    </section>
  );
}
