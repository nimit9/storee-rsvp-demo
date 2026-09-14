import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EVENTS,
  TIER_LABELS,
  invitedTo,
  type Rsvp,
  type RsvpPatch,
  type YesNo,
} from "../types";

/** Keeps text edits within the limits used by the demo state. */
export const MAX_EXTRA_GUESTS = 20;

interface Props {
  row: Rsvp | null;
  onClose: () => void;
  onSave: (id: number, patch: RsvpPatch) => void;
}

type Draft = Required<
  Pick<
    Rsvp,
    | "name"
    | "whatsapp"
    | "side"
    | "attend_haldi"
    | "attend_sangeet"
    | "attend_wedding"
    | "attend_reception"
    | "guest_count"
    | "guest_names"
    | "note"
    | "verified"
    | "hidden"
  >
>;

const EDITABLE_KEYS = [
  "name",
  "whatsapp",
  "side",
  ...EVENTS.map((e) => e.col),
  "guest_count",
  "guest_names",
  "note",
  "verified",
  "hidden",
] as const;

function toDraft(r: Rsvp): Draft {
  return {
    name: r.name,
    whatsapp: r.whatsapp ?? "",
    side: r.side ?? "",
    attend_haldi: r.attend_haldi,
    attend_sangeet: r.attend_sangeet,
    attend_wedding: r.attend_wedding,
    attend_reception: r.attend_reception,
    guest_count: r.guest_count ?? 0,
    guest_names: r.guest_names ?? "",
    note: r.note ?? "",
    verified: r.verified,
    hidden: r.hidden,
  };
}

export function EditDialog({ row, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    setDraft(row ? toDraft(row) : null);
  }, [row]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  // Only send what actually changed — a no-op Save should not fire a request or
  // claim it saved something.
  const patch = useMemo<RsvpPatch>(() => {
    if (!row || !draft) return {};
    const out: Record<string, unknown> = {};
    for (const k of EDITABLE_KEYS) {
      if (draft[k as keyof Draft] !== (toDraft(row)[k as keyof Draft] as unknown)) {
        out[k] = draft[k as keyof Draft];
      }
    }
    return out as RsvpPatch;
  }, [row, draft]);

  const dirty = Object.keys(patch).length > 0;
  const nameError = draft && !draft.name.trim() ? "A name is required." : null;
  const countError =
    draft && draft.guest_count > MAX_EXTRA_GUESTS
      ? `The most this can hold is ${MAX_EXTRA_GUESTS}.`
      : draft && draft.guest_count < 0
        ? "This can’t be negative."
        : null;
  const valid = !nameError && !countError;

  function save() {
    if (row && dirty && valid) onSave(row.id, patch);
    onClose();
  }

  if (!draft) return <Dialog open={false} onOpenChange={() => {}} />;

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {row ? row.name : "Edit guest"}
          </DialogTitle>
          <DialogDescription>
            {row && TIER_LABELS[row.guest_type]
              ? `Invited to: ${TIER_LABELS[row.guest_type].toLowerCase()}. Changes save to the guest list straight away.`
              : "Changes save to the guest list straight away."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="grid gap-2">
            <Label htmlFor="e-name">Name</Label>
            <Input
              id="e-name"
              value={draft.name}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "e-name-error" : undefined}
              onChange={(e) => set("name", e.target.value)}
            />
            {nameError && (
              <p id="e-name-error" className="text-sm text-destructive">
                {nameError}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="e-wa">WhatsApp number</Label>
              <Input
                id="e-wa"
                inputMode="tel"
                value={draft.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="e-side">Whose side</Label>
              <Input
                id="e-side"
                value={draft.side}
                placeholder="Aanya, Dev or Both"
                onChange={(e) => set("side", e.target.value)}
              />
            </div>
          </div>

          <fieldset className="grid gap-3">
            <legend className="mb-1 text-sm font-medium">Coming to</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {EVENTS.map((ev) => {
                const invited = row ? invitedTo(row, ev.key) : true;
                return (
                  <div className="grid gap-1.5" key={ev.col}>
                    <Label htmlFor={`e-${ev.key}`} className="text-muted-foreground">
                      {ev.label}
                    </Label>
                    <Select
                      value={draft[ev.col] || "none"}
                      onValueChange={(v) => set(ev.col, (v === "none" ? "" : v) as YesNo)}
                    >
                      <SelectTrigger id={`e-${ev.key}`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No reply yet</SelectItem>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                    {!invited && (
                      <p className="text-xs text-muted-foreground">
                        Their link didn’t include this event.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <div className="grid gap-1.5">
              <Label htmlFor="e-gc">Extra guests</Label>
              <Input
                id="e-gc"
                type="number"
                min={0}
                max={MAX_EXTRA_GUESTS}
                value={draft.guest_count}
                aria-invalid={!!countError}
                aria-describedby="e-gc-hint"
                onChange={(e) => set("guest_count", parseInt(e.target.value, 10) || 0)}
              />
              <p
                id="e-gc-hint"
                className={countError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
              >
                {countError ?? `Up to ${MAX_EXTRA_GUESTS}, not counting them.`}
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="e-gn">Who they’re bringing</Label>
              <Input
                id="e-gn"
                value={draft.guest_names}
                placeholder="Separate names with commas"
                onChange={(e) => set("guest_names", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="e-note">Note</Label>
            <Input
              id="e-note"
              value={draft.note}
              placeholder="Dietary needs, travel plans, anything to remember"
              onChange={(e) => set("note", e.target.value)}
            />
          </div>

          <div className="grid gap-3 border-t pt-4">
            <label
              htmlFor="e-verified"
              className="flex cursor-pointer items-start justify-between gap-4"
            >
              <span>
                <span className="text-sm font-medium">Spoken to</span>
                <span className="block text-xs text-muted-foreground">
                  You’ve already been in touch about their reply, so you don’t chase them twice.
                </span>
              </span>
              <Switch
                id="e-verified"
                checked={!!draft.verified}
                onCheckedChange={(c) => set("verified", c ? 1 : 0)}
                aria-label="Spoken to this guest about their reply"
              />
            </label>
            <label
              htmlFor="e-hidden"
              className="flex cursor-pointer items-start justify-between gap-4"
            >
              <span>
                <span className="text-sm font-medium">Hidden from the list</span>
                <span className="block text-xs text-muted-foreground">
                  For test or joke entries. Nothing is deleted — turn on “Include hidden” to see
                  them again.
                </span>
              </span>
              <Switch
                id="e-hidden"
                checked={!!draft.hidden}
                onCheckedChange={(c) => set("hidden", c ? 1 : 0)}
                aria-label="Hide this guest from the list"
              />
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!dirty || !valid}>
            {dirty ? "Save changes" : "No changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
