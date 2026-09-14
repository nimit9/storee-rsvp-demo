import { ArrowDownUp, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type SortKey = "recent" | "name" | "guests";
export type SortDir = "asc" | "desc";

export interface Filters {
  q: string;
  /** Which invite link's guests to show. "everyone" is the consolidated view.
      Other values are tier keys from TIERS — note the all-four-events *link* is
      itself the tier "all", which is why the consolidated value isn't "all". */
  tier: string;
  event: string;
  side: string;
  sort: SortKey;
  dir: SortDir;
  attendingOnly: boolean;
  showHidden: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  q: "",
  tier: "everyone",
  event: "all",
  side: "any",
  sort: "recent",
  dir: "desc",
  attendingOnly: false,
  showHidden: false,
};

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Date replied",
  name: "Name",
  guests: "People coming",
};

// Direction reads differently per column, so name the actual outcome.
export const DIR_LABELS: Record<SortKey, Record<SortDir, string>> = {
  recent: { desc: "Newest first", asc: "Oldest first" },
  name: { asc: "A to Z", desc: "Z to A" },
  guests: { desc: "Largest first", asc: "Smallest first" },
};

export const SEARCH_INPUT_ID = "guest-search";

interface Props {
  filters: Filters;
  set: (patch: Partial<Filters>) => void;
  sides: string[];
  /** Only the events relevant to the current view, so the filter can't offer
      an event nobody on screen was invited to. */
  events: readonly { key: string; label: string }[];
}

export function Toolbar({ filters, set, sides, events }: Props) {
  const f = filters;
  const chips: { label: string; clear: Partial<Filters> }[] = [];
  if (f.q) chips.push({ label: `“${f.q}”`, clear: { q: "" } });
  if (f.event !== "all")
    chips.push({
      label: events.find((e) => e.key === f.event)?.label ?? f.event,
      clear: { event: "all" },
    });
  if (f.side !== "any") chips.push({ label: f.side, clear: { side: "any" } });
  if (f.attendingOnly) chips.push({ label: "Coming only", clear: { attendingOnly: false } });
  if (f.showHidden) chips.push({ label: "Including hidden", clear: { showHidden: false } });

  const nextDir: SortDir = f.dir === "asc" ? "desc" : "asc";

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id={SEARCH_INPUT_ID}
            className="h-11 pl-9 sm:h-9"
            placeholder="Search name, number, guest…"
            aria-label="Search guests by name, phone number, guest name or note"
            value={f.q}
            onChange={(e) => set({ q: e.target.value })}
          />
        </div>

        <Select value={f.event} onValueChange={(v) => set({ event: v })}>
          <SelectTrigger className="w-[150px]" aria-label="Filter by event">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            {events.map((e) => (
              <SelectItem key={e.key} value={e.key}>
                Coming to {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={f.side} onValueChange={(v) => set({ side: v })}>
          <SelectTrigger className="w-[150px]" aria-label="Filter by whose side the guest is from">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Either side</SelectItem>
            {sides.map((s) => (
              <SelectItem key={s} value={s}>
                {s}’s side
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Select value={f.sort} onValueChange={(v) => set({ sort: v as SortKey })}>
            <SelectTrigger className="w-[140px]" aria-label="Sort the list by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {SORT_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0 sm:h-9 sm:w-9"
                onClick={() => set({ dir: nextDir })}
                aria-label={`Sort order: ${DIR_LABELS[f.sort][f.dir]}. Switch to ${DIR_LABELS[f.sort][nextDir].toLowerCase()}.`}
              >
                <ArrowDownUp className="h-4 w-4" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{DIR_LABELS[f.sort][f.dir]}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <label
          htmlFor="filter-attending"
          className="flex cursor-pointer items-center gap-2 py-3 text-sm text-muted-foreground sm:py-1.5"
        >
          <Switch
            id="filter-attending"
            checked={f.attendingOnly}
            onCheckedChange={(c) => set({ attendingOnly: c })}
            aria-label="Show only guests coming to at least one event"
          />
          Coming to something
        </label>
        <label
          htmlFor="filter-hidden"
          className="flex cursor-pointer items-center gap-2 py-3 text-sm text-muted-foreground sm:py-1.5"
        >
          <Switch
            id="filter-hidden"
            checked={f.showHidden}
            onCheckedChange={(c) => set({ showHidden: c })}
            aria-label="Include rows that have been hidden from the list"
          />
          Include hidden
        </label>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-xs text-muted-foreground">Filtered by</span>
          {chips.map((c, i) => (
            <Badge key={i} variant="secondary" className="gap-1 pr-1 font-normal">
              {c.label}
              <button
                onClick={() => set(c.clear)}
                className="rounded-full p-1 hover:bg-background/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                aria-label={`Remove filter ${c.label}`}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => set({ ...DEFAULT_FILTERS, tier: f.tier })}
          >
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
}
