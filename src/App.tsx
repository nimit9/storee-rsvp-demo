import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Link2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMediaQuery } from "./hooks/useMediaQuery";
import {
  EVENTS,
  TIERS,
  TIER_LABELS,
  heads,
  invitedTo,
  isAttending,
  plusOnes,
  totalHeads,
  type Rsvp,
  type RsvpPatch,
} from "./types";
import { ApiError, AuthError, fetchRsvps, patchRsvp } from "./api";
import { LoginScreen } from "./components/LoginScreen";
import { Summary } from "./components/Summary";
import {
  DEFAULT_FILTERS,
  SEARCH_INPUT_ID,
  Toolbar,
  type Filters,
  type SortDir,
  type SortKey,
} from "./components/Toolbar";
import { GuestTable } from "./components/GuestTable";
import { GuestCards } from "./components/GuestCards";
import { EditDialog } from "./components/EditDialog";
import { InviteLinks } from "./components/InviteLinks";
import { AttendLegend } from "./components/GuestBits";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "./components/ThemeToggle";

const COUPLE = "Aanya & Dev";

/** The view switcher. "everyone" is the consolidated list; the rest are invite tiers. */
const VIEWS = [
  { value: "everyone", label: "Everyone (consolidated)" },
  ...Object.keys(TIERS).map((tier) => ({
    value: tier,
    label: `${TIER_LABELS[tier] ?? tier} link`,
  })),
];

function viewLabel(tier: string) {
  return VIEWS.find((v) => v.value === tier)?.label ?? tier;
}

/** Sensible starting direction per column, so switching sort never reads backwards. */
const NATURAL_DIR: Record<SortKey, SortDir> = { recent: "desc", name: "asc", guests: "desc" };

// Filters live in the URL so a view can be reloaded, bookmarked, or sent to a
// family member. Only non-default values are written, keeping the URL readable.
function readFilters(): Filters {
  const p = new URLSearchParams(window.location.search);
  const sort = (p.get("sort") as SortKey) || DEFAULT_FILTERS.sort;
  return {
    q: p.get("q") ?? DEFAULT_FILTERS.q,
    tier: p.get("view") ?? DEFAULT_FILTERS.tier,
    event: p.get("event") ?? DEFAULT_FILTERS.event,
    side: p.get("side") ?? DEFAULT_FILTERS.side,
    sort: NATURAL_DIR[sort] ? sort : DEFAULT_FILTERS.sort,
    dir: (p.get("dir") as SortDir) === "asc" ? "asc" : (p.get("dir") as SortDir) === "desc" ? "desc" : NATURAL_DIR[sort] ?? DEFAULT_FILTERS.dir,
    attendingOnly: p.get("coming") === "1",
    showHidden: p.get("hidden") === "1",
  };
}

function writeFilters(f: Filters) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.tier !== DEFAULT_FILTERS.tier) p.set("view", f.tier);
  if (f.event !== DEFAULT_FILTERS.event) p.set("event", f.event);
  if (f.side !== DEFAULT_FILTERS.side) p.set("side", f.side);
  if (f.sort !== DEFAULT_FILTERS.sort) p.set("sort", f.sort);
  if (f.dir !== NATURAL_DIR[f.sort]) p.set("dir", f.dir);
  if (f.attendingOnly) p.set("coming", "1");
  if (f.showHidden) p.set("hidden", "1");
  const qs = p.toString();
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function App() {
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "locked">("loading");
  const [error, setError] = useState<string>("");
  const [filters, setFilters] = useState<Filters>(readFilters);
  const [editing, setEditing] = useState<Rsvp | null>(null);
  const [showLinks, setShowLinks] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const rowsRef = useRef<Rsvp[]>([]);
  rowsRef.current = rsvps;

  const reload = useCallback(() => {
    return fetchRsvps()
      .then((rows) => {
        setRsvps(rows);
        setStatus("ready");
        setError("");
      })
      .catch((e: unknown) => {
        if (e instanceof AuthError) {
          setStatus("locked");
          setError("");
          return;
        }
        setError(e instanceof ApiError ? e.message : "Something went wrong loading the list.");
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    writeFilters(filters);
  }, [filters]);

  // "/" jumps to search — the one shortcut worth having when a new reply lands.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      const input = document.getElementById(SEARCH_INPUT_ID);
      if (input) {
        e.preventDefault();
        (input as HTMLInputElement).focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const set = useCallback((patch: Partial<Filters>) => {
    setFilters((f) => {
      const next = { ...f, ...patch };
      // Changing the column resets to that column's natural direction.
      if (patch.sort !== undefined && patch.dir === undefined) next.dir = NATURAL_DIR[patch.sort];
      return next;
    });
  }, []);

  /**
   * Optimistic write, then reconcile against the row the server actually stored.
   * The server clamps and trims, so trusting the local copy can leave the screen
   * showing a headcount the database does not hold.
   */
  const onPatch = useCallback(
    (id: number, patch: RsvpPatch, label = "Saved", opts?: { undo?: boolean }) => {
      const before = rowsRef.current.find((r) => r.id === id);
      if (!before) return;

      const undoPatch = Object.fromEntries(
        Object.keys(patch).map((k) => [k, before[k as keyof Rsvp]]),
      ) as RsvpPatch;

      setRsvps((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

      patchRsvp(id, patch)
        .then(({ rsvp, clamped }) => {
          // Server truth wins over the optimistic guess.
          setRsvps((prev) => prev.map((r) => (r.id === id ? rsvp : r)));

          if (clamped.length) {
            toast.warning(`Saved, but ${describeClamp(clamped)}`, {
              description: "The list now shows what was actually stored.",
            });
            return;
          }
          const toastId = toast.success(label, {
            action:
              opts?.undo === false
                ? undefined
                : {
                    label: "Undo",
                    onClick: () => {
                      // Dismiss the toast that offered the Undo, or it lingers
                      // with a live action and the row can be re-toggled from it.
                      toast.dismiss(toastId);
                      onPatch(id, undoPatch, "Change undone", { undo: false });
                    },
                  },
          });
        })
        .catch((e: unknown) => {
          // Put the row back rather than leaving a value that never saved.
          setRsvps((prev) => prev.map((r) => (r.id === id ? before : r)));
          if (e instanceof AuthError) {
            setStatus("locked");
            toast.error(e.message);
            return;
          }
          toast.error(e instanceof ApiError ? e.message : "That change didn’t save.", {
            description: `${before.name} is unchanged.`,
            action: { label: "Retry", onClick: () => onPatch(id, patch, label) },
          });
        });
    },
    [],
  );

  const sides = useMemo(
    () => [...new Set(rsvps.map((r) => (r.side || "").trim()).filter(Boolean))].sort(),
    [rsvps],
  );

  const visible = useMemo(() => {
    const q = filters.q.toLowerCase();
    const rows = rsvps.filter((r) => {
      if (!filters.showHidden && r.hidden) return false;
      if (filters.tier !== "everyone" && r.guest_type !== filters.tier) return false;
      if (filters.side !== "any" && (r.side || "") !== filters.side) return false;
      if (filters.event !== "all") {
        const col = EVENTS.find((e) => e.key === filters.event)!.col;
        if (r[col] !== "Yes") return false;
      }
      if (filters.attendingOnly && !isAttending(r)) return false;
      if (q) {
        const hay = `${r.name} ${r.whatsapp} ${r.guest_names} ${r.note} ${r.side}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const mul = filters.dir === "asc" ? 1 : -1;
    const sorted = [...rows];
    if (filters.sort === "name") {
      sorted.sort((a, b) => mul * a.name.localeCompare(b.name));
    } else if (filters.sort === "guests") {
      sorted.sort(
        (a, b) =>
          mul * (1 + (a.guest_count || 0) - (1 + (b.guest_count || 0))) ||
          a.name.localeCompare(b.name),
      );
    } else {
      sorted.sort((a, b) => mul * a.created_at.localeCompare(b.created_at));
    }
    return sorted;
  }, [rsvps, filters]);

  // Viewing one invite link means three of the four event columns would be
  // entirely shaded. Narrow them — but keep any event a guest on screen actually
  // has an answer for, so a hand-edited row can never hide data.
  const shownEvents = useMemo(() => {
    if (filters.tier === "everyone") return EVENTS;
    const tierKeys = TIERS[filters.tier];
    if (!tierKeys) return EVENTS;
    return EVENTS.filter(
      (e) =>
        (tierKeys as readonly string[]).includes(e.key) ||
        visible.some((r) => r[e.col] !== ""),
    );
  }, [filters.tier, visible]);

  // One phrase describing what's on screen, reused by the headcount panel, the
  // export button, and the export itself so the three can never disagree.
  const scope = useMemo(() => {
    const parts: string[] = [];
    if (filters.tier !== "everyone") parts.push(`on the ${viewLabel(filters.tier)}`);
    if (filters.event !== "all") {
      parts.push(`coming to the ${EVENTS.find((e) => e.key === filters.event)?.label}`);
    }
    if (filters.side !== "any") parts.push(`${filters.side}’s side`);
    if (filters.attendingOnly) parts.push("coming to something");
    if (filters.q) parts.push(`matching “${filters.q}”`);
    if (filters.showHidden) parts.push("including hidden rows");
    return parts;
  }, [filters]);

  const filtered = scope.length > 0;
  const liveTotal = rsvps.filter((r) => !r.hidden).length;
  const scopeLabel = filtered
    ? `${visible.length} of ${liveTotal} guests · ${scope.join(" · ")}`
    : `All ${liveTotal} guests who have replied`;

  function exportCsv() {
    const cols = [
      { head: "Name", get: (r: Rsvp) => r.name },
      { head: "WhatsApp", get: (r: Rsvp) => r.whatsapp },
      { head: "Side", get: (r: Rsvp) => r.side },
      // "Not invited" and "No reply" must stay distinct here too. Collapsing
      // them turns a Reception-only guest into someone who ignored three
      // questions, on the sheet that goes to a venue.
      ...shownEvents.map((e) => ({
        head: e.label,
        get: (r: Rsvp) => (!invitedTo(r, e.key) ? "Not invited" : r[e.col] || "No reply"),
      })),
      { head: "Extra guests", get: (r: Rsvp) => r.guest_count },
      { head: "Who they're bringing", get: (r: Rsvp) => r.guest_names },
      { head: "People", get: (r: Rsvp) => (isAttending(r) ? 1 + (r.guest_count || 0) : 0) },
      { head: "Spoken to", get: (r: Rsvp) => (r.verified ? "Yes" : "No") },
      { head: "Hidden", get: (r: Rsvp) => (r.hidden ? "Yes" : "No") },
      { head: "Note", get: (r: Rsvp) => r.note },
      { head: "Replied on", get: (r: Rsvp) => r.created_at.slice(0, 10) },
    ];

    const lines = [
      cols.map((c) => csvCell(c.head)).join(","),
      ...visible.map((r) => cols.map((c) => csvCell(c.get(r))).join(",")),
      "",
      // Totals last, so the top of the file stays clean for spreadsheet import.
      `${csvCell("Rows included")},${csvCell(
        scope.length ? `Guests ${scope.join("; ")}` : "All guests who have replied",
      )}`,
      `${csvCell("Exported on")},${csvCell(new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }))}`,
      `${csvCell("Guests listed")},${visible.length}`,
      `${csvCell("People in total")},${totalHeads(visible)}`,
      `${csvCell("Guests attending")},${visible.filter(isAttending).length}`,
      `${csvCell("Plus-ones")},${plusOnes(visible)}`,
      ...shownEvents.map(
        (e) => `${csvCell(`People — ${e.label} (${e.date})`)},${heads(visible, e.col)}`,
      ),
    ];

    const stamp = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(
      new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }),
    );
    // The anchor has to be in the document, and the blob URL has to outlive the
    // click: revoking it synchronously can cancel the download the click just
    // started, which shows up as a file that arrives very late or not at all.
    const viewSlug = filters.tier === "everyone" ? "all" : filters.tier;
    const a = document.createElement("a");
    a.href = url;
    a.download = `demo-guests-${viewSlug}-${stamp}.csv`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    toast.success(
      `Exported ${visible.length} guests · ${totalHeads(visible)} people`,
      { description: scope.length ? scope.join(" · ") : "Everyone who has replied" },
    );
  }

  const trueEmpty = status === "ready" && rsvps.length === 0;

  if (status === "locked") {
    return (
      <>
        <LoginScreen couple={COUPLE} onSuccess={reload} />
        <Toaster richColors position="bottom-center" />
      </>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {COUPLE}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Guest list · Haldi to Reception, 27 Dec 2026 – 2 Jan 2027
            </p>
            <a
              href="https://storeestudio.in"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-baseline gap-1 rounded-full bg-[#2a1a14] px-3 py-1 text-[11px] text-[#fdf8f3] shadow-sm transition-colors hover:bg-[#40291f]"
            >
              Demo by <span className="font-display text-[13px]">Sto<span className="text-[#f37aa3]">ree</span></span>
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-11 min-w-11 sm:h-9 sm:min-w-0"
              onClick={() => setShowLinks((v) => !v)}
              aria-expanded={showLinks}
              aria-controls="invite-links"
            >
              <Link2 className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Invite links</span>
              <span className="sr-only sm:hidden">Invite links</span>
            </Button>
            <Button
              variant="outline"
              className="h-11 min-w-11 sm:h-9 sm:min-w-0"
              onClick={exportCsv}
              // Nothing to export is not a success. An all-zeros file with a
              // "Exported 0 guests" toast is the first thing an empty list did.
              disabled={status !== "ready" || visible.length === 0}
              title={visible.length === 0 ? "Nothing to export yet" : undefined}
            >
              <Download className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Export</span>
              <span className="sr-only sm:hidden">Export the guest list as CSV</span>
            </Button>
            <ThemeToggle />
          </div>
        </header>

        {showLinks && (
          <section
            id="invite-links"
            aria-label="Invite links"
            className="mb-6 rounded-lg border bg-card p-4"
          >
            <h2 className="text-sm font-medium">Send the right link to the right people</h2>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">
              Each link only asks about the events that group is invited to.
            </p>
            <InviteLinks />
          </section>
        )}

        <main>
          {status === "loading" && (
            <div className="space-y-6">
              <span className="sr-only" role="status">
                Loading the guest list
              </span>
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          )}

          {status === "error" && (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <h2 className="font-medium">The guest list didn’t load</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" className="mt-4" onClick={reload}>
                <RefreshCw className="h-4 w-4" aria-hidden />
                Try again
              </Button>
            </div>
          )}

          {trueEmpty && (
            <section className="rounded-lg border bg-card p-6 sm:p-10">
              <h2 className="font-display text-2xl font-semibold">No replies yet</h2>
              <p className="mt-2 max-w-prose text-sm text-muted-foreground">
                Guests appear here the moment they answer their link — name, which events they’re
                coming to, who they’re bringing. Nothing to do until then.
              </p>
              <h3 className="mt-8 text-sm font-medium">The four invite links</h3>
              <p className="mt-1 mb-3 text-sm text-muted-foreground">
                Send each group the link that matches what they’re invited to.
              </p>
              <InviteLinks />
            </section>
          )}

          {status === "ready" && rsvps.length > 0 && (
            <div className="space-y-6">
              <Summary
                rows={visible}
                scopeLabel={scopeLabel}
                filtered={filtered}
                events={shownEvents}
              />

              <Toolbar filters={filters} set={set} sides={sides} events={shownEvents} />

              <section aria-labelledby="guests-heading">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Select value={filters.tier} onValueChange={(v) => set({ tier: v })}>
                      <SelectTrigger
                        id="view-select"
                        className="w-[248px]"
                        aria-label="Choose which invite link's guests to show"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VIEWS.map((v) => (
                          <SelectItem key={v.value} value={v.value}>
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <h2 id="guests-heading" className="text-sm font-medium">
                      {filtered ? (
                        <>
                          <span className="tnum">{visible.length}</span> of{" "}
                          <span className="tnum">{liveTotal}</span> guests
                        </>
                      ) : (
                        <>
                          <span className="tnum">{visible.length}</span>{" "}
                          {visible.length === 1 ? "guest" : "guests"}
                        </>
                      )}
                    </h2>
                  </div>
                  {visible.length > 0 && isDesktop && (
                    <AttendLegend className="text-xs text-muted-foreground" />
                  )}
                </div>

                {visible.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-10 text-center">
                    <p className="font-medium">No guest matches these filters</p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                      {scope.join(" · ")}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => set(DEFAULT_FILTERS)}
                    >
                      Clear all filters
                    </Button>
                  </div>
                ) : isDesktop ? (
                  <GuestTable
                    rows={visible}
                    events={shownEvents}
                    sort={filters.sort}
                    dir={filters.dir}
                    onSort={(k) =>
                      set(
                        k === filters.sort
                          ? { dir: filters.dir === "asc" ? "desc" : "asc" }
                          : { sort: k },
                      )
                    }
                    onEdit={setEditing}
                    onPatch={onPatch}
                  />
                ) : (
                  <GuestCards
                    rows={visible}
                    events={shownEvents}
                    onEdit={setEditing}
                    onPatch={onPatch}
                  />
                )}
              </section>
            </div>
          )}
        </main>
      </div>

      <EditDialog
        row={editing}
        onClose={() => setEditing(null)}
        onSave={(id, patch) => onPatch(id, patch, "Changes saved")}
      />
      <Toaster richColors position="bottom-center" />
    </TooltipProvider>
  );
}

function describeClamp(fields: string[]): string {
  const names: Record<string, string> = {
    guest_count: "the number of extra guests was capped at 20",
    name: "the name was shortened to fit",
    note: "the note was shortened to fit",
    guest_names: "the guest names were shortened to fit",
    whatsapp: "the number was shortened to fit",
    side: "the side was shortened to fit",
  };
  const described = fields.map((f) => names[f]).filter(Boolean);
  if (!described.length) return "the server adjusted a value";
  return described.join(", and ");
}
