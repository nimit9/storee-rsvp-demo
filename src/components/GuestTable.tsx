import { ArrowDown, ArrowUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { invitedTo, type EventCol, type EventKey, type Rsvp, type RsvpPatch } from "../types";
import { AttendMark, SideText } from "./GuestBits";
import { RowMenu } from "./RowMenu";
import { NoteField } from "./NoteField";
import { DIR_LABELS, type SortDir, type SortKey } from "./Toolbar";

interface Props {
  rows: Rsvp[];
  /** The event columns to render — narrowed when viewing a single invite link. */
  events: readonly { key: EventKey; col: EventCol; label: string }[];
  sort: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  onEdit: (r: Rsvp) => void;
  onPatch: (id: number, patch: RsvpPatch, label: string) => void;
}

function SortHead({
  label,
  sortKey,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}) {
  const next = active ? (dir === "asc" ? "desc" : "asc") : dir;
  return (
    <TableHead
      className={className}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        onClick={onClick}
        className={cn(
          "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-foreground",
          "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
          active && "text-foreground",
        )}
        aria-label={
          active
            ? `${label}, sorted ${DIR_LABELS[sortKey][dir].toLowerCase()}. Activate to sort ${DIR_LABELS[sortKey][next].toLowerCase()}.`
            : `Sort by ${label.toLowerCase()}`
        }
      >
        {label}
        {active &&
          (dir === "asc" ? (
            <ArrowUp className="h-3 w-3" aria-hidden />
          ) : (
            <ArrowDown className="h-3 w-3" aria-hidden />
          ))}
      </button>
    </TableHead>
  );
}

export function GuestTable({ rows, events, sort, dir, onSort, onEdit, onPatch }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortHead
              label="Guest"
              sortKey="name"
              active={sort === "name"}
              dir={dir}
              onClick={() => onSort("name")}
            />
            <TableHead>Side</TableHead>
            {/* Group boundary: who they are | what they answered */}
            {events.map((e, i) => (
              <TableHead key={e.key} className={cn("text-center", i === 0 && "border-l")}>
                {e.label}
              </TableHead>
            ))}
            <SortHead
              label="People"
              sortKey="guests"
              active={sort === "guests"}
              dir={dir}
              onClick={() => onSort("guests")}
              className="text-center"
            />
            {/* Group boundary: their answers | our working notes */}
            <TableHead className="border-l">Note</TableHead>
            <TableHead className="text-center">Spoken to</TableHead>
            <SortHead
              label="Replied"
              sortKey="recent"
              active={sort === "recent"}
              dir={dir}
              onClick={() => onSort("recent")}
            />
            <TableHead className="w-12">
              <span className="sr-only">Row actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-2 font-medium">
                    {r.name}
                    {/* Stated, not just dimmed — opacity alone reads as a rendering bug. */}
                    {!!r.hidden && (
                      <span className="rounded border px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">
                        Hidden
                      </span>
                    )}
                  </span>
                  {r.whatsapp ? (
                    <span className="tnum text-xs text-muted-foreground">{r.whatsapp}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No number</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <SideText side={r.side} />
              </TableCell>
              {events.map((e, i) => (
                <TableCell
                  key={e.key}
                  className={cn(
                    "text-center",
                    i === 0 && "border-l",
                    // Tint, not a faint glyph: decoration has no contrast floor,
                    // so this can be strong enough to actually read as shaded.
                    // bg-muted/60 measured ~1.06:1 against the row — invisible.
                    !invitedTo(r, e.key) && "bg-muted-foreground/15",
                  )}
                >
                  <AttendMark r={r} event={e} layout="cell" />
                </TableCell>
              ))}
              <TableCell className="text-center">
                {/* The number of people in their group, not "+N". The em dash
                    meant "no reply" one column earlier, so reusing it for "no
                    extra guests" taught two meanings in one row. */}
                {r.guest_names ? (
                  <Tooltip>
                    <TooltipTrigger className="cursor-help font-medium tnum underline decoration-dotted underline-offset-2">
                      {1 + (r.guest_count || 0)}
                      <span className="sr-only"> — with {r.guest_names}</span>
                    </TooltipTrigger>
                    <TooltipContent>with {r.guest_names}</TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="tnum">{1 + (r.guest_count || 0)}</span>
                )}
              </TableCell>
              <TableCell className="border-l">
                <NoteField
                  row={r}
                  onPatch={onPatch}
                  className="h-9 min-w-[150px] bg-transparent shadow-none dark:bg-transparent"
                />
              </TableCell>
              <TableCell className="text-center">
                <Switch
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
              </TableCell>
              <TableCell className="tnum whitespace-nowrap text-sm text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </TableCell>
              <TableCell>
                <RowMenu r={r} onEdit={onEdit} onPatch={onPatch} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
