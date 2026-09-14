export type YesNo = "Yes" | "No" | "";

export interface Rsvp {
  id: number;
  code: string;
  guest_type: string;
  name: string;
  whatsapp: string;
  side: string;
  attend_haldi: YesNo;
  attend_sangeet: YesNo;
  attend_wedding: YesNo;
  attend_reception: YesNo;
  guest_count: number;
  guest_names: string;
  verified: 0 | 1;
  hidden: 0 | 1;
  note: string;
  created_at: string;
}

// Fields the dashboard is allowed to patch. Mirrors FIELDS in
// the dashboard state updater.
export type RsvpPatch = Partial<
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

// The event list. Everything in the dashboard renders off this array — column
// counts, filters, the edit dialog, the CSV — so a couple with three or five
// events needs this changed and nothing else on the client. The matching
// dashboard edits are deliberately limited to these fields.
export const EVENTS = [
  { key: "haldi", col: "attend_haldi", label: "Haldi", date: "27 Dec 2026" },
  { key: "sangeet", col: "attend_sangeet", label: "Sangeet", date: "28 Dec 2026" },
  { key: "wedding", col: "attend_wedding", label: "Wedding", date: "30 Dec 2026" },
  { key: "reception", col: "attend_reception", label: "Reception", date: "2 Jan 2027" },
] as const;

export type EventCol = (typeof EVENTS)[number]["col"];
export type EventKey = (typeof EVENTS)[number]["key"];

// Which events each invite tier was actually asked about. Mirrors EVENT_ORDER
// in static/app.js. Without this, a blank cell can't be told apart from a
// "never invited" one — a Reception-only guest would read as three refusals.
export const TIERS: Record<string, readonly EventKey[]> = {
  all: ["haldi", "sangeet", "wedding", "reception"],
  sangeet: ["sangeet", "wedding", "reception"],
  wedding: ["wedding", "reception"],
  reception: ["reception"],
};

// The four invite links, so the dashboard can hand them out instead of leaving
// the host to hunt for them. Slugs must match SLUGS in static/app.js and
// the chat flow exactly.
export const INVITE_LINKS: { slug: string; tier: string }[] = [
  { slug: "demo", tier: "all" },
  { slug: "sangeet-demo", tier: "sangeet" },
  { slug: "wedding-demo", tier: "wedding" },
  { slug: "reception-demo", tier: "reception" },
];

export const TIER_LABELS: Record<string, string> = {
  all: "All four events",
  sangeet: "Sangeet onward",
  wedding: "Wedding & Reception",
  reception: "Reception only",
};

// Was this guest invited to this event at all? Unknown tiers fall back to true
// so an unexpected guest_type shows the data rather than hiding it.
export function invitedTo(r: Rsvp, key: EventKey): boolean {
  const tier = TIERS[r.guest_type];
  return tier ? tier.includes(key) : true;
}

// A "head" = the guest + their extra guests, counted only when Yes to that
// event and the row isn't hidden.
export function heads(rows: Rsvp[], col: EventCol): number {
  return rows.reduce(
    (sum, r) => (!r.hidden && r[col] === "Yes" ? sum + 1 + (r.guest_count || 0) : sum),
    0,
  );
}

export function isAttending(r: Rsvp): boolean {
  return EVENTS.some((e) => r[e.col] === "Yes");
}

// Replied to every event they were invited to. Used to separate "still
// deciding" from "answered no to everything".
export function hasReplied(r: Rsvp): boolean {
  const tier = TIERS[r.guest_type] ?? EVENTS.map((e) => e.key);
  return tier.some((key) => {
    const ev = EVENTS.find((e) => e.key === key)!;
    return r[ev.col] === "Yes" || r[ev.col] === "No";
  });
}

// Total extra guests (plus-ones) across attending, non-hidden rows.
export function plusOnes(rows: Rsvp[]): number {
  return rows.reduce((s, r) => (!r.hidden && isAttending(r) ? s + (r.guest_count || 0) : s), 0);
}

// Total heads across attending, non-hidden rows — the guest plus their party.
export function totalHeads(rows: Rsvp[]): number {
  return rows.reduce(
    (s, r) => (!r.hidden && isAttending(r) ? s + 1 + (r.guest_count || 0) : s),
    0,
  );
}

// Digits-only phone -> wa.me link (or null if there's nothing dialable).
export function waLink(whatsapp: string): string | null {
  const digits = (whatsapp || "").replace(/[^\d]/g, "");
  return digits.length >= 7 ? `https://wa.me/${digits}` : null;
}
