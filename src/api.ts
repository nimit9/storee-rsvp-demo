// Demo build: stands in for the real Cloudflare Functions API. Everything
// here operates on an in-memory copy of DEMO_RSVPS — nothing is persisted,
// nothing leaves the browser, and there is no login gate.
import type { Rsvp, RsvpPatch } from "./types";
import { DEMO_RSVPS } from "./demoData";

export interface PatchResult {
  rsvp: Rsvp;
  clamped: string[];
}

export class ApiError extends Error {}
export class AuthError extends ApiError {}

// Reset on every full page load, so refreshing gives visitors a clean demo.
let rows: Rsvp[] = DEMO_RSVPS.map((r) => ({ ...r }));

function delay(ms = 250) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchRsvps(): Promise<Rsvp[]> {
  await delay();
  return rows.map((r) => ({ ...r }));
}

export async function patchRsvp(id: number, body: RsvpPatch): Promise<PatchResult> {
  await delay(150);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) throw new ApiError("That guest is no longer in the list.");
  rows[idx] = { ...rows[idx], ...body } as Rsvp;
  return { rsvp: { ...rows[idx] }, clamped: [] };
}

export async function deleteRsvp(id: number): Promise<void> {
  await delay(150);
  rows = rows.filter((r) => r.id !== id);
}

export async function login(_password: string): Promise<void> {
  await delay(150);
}

export async function logout(): Promise<void> {
  await delay(50);
}
