// Local "my tickets" registry.
//
// The public DR Travel site has no customer login. The ticket token issued
// when a booking is confirmed is itself the proof of ownership (the same
// token is required to view the ticket via /ticket/:token). We persist the
// tokens of tickets that the user has explicitly opened in this browser so
// the homepage can surface a pre-trip reminder banner for upcoming trips.
//
// This is therefore a per-device, possession-token based "logged-in" proxy
// — not a real customer session. Anyone using the same browser profile sees
// the same upcoming-trip banner.

const STORAGE_KEY = "dr-travel-my-tickets-v1";
const MAX_STORED = 10;

export interface StoredTicket {
  token: string;
  savedAt: number;
}

function isStoredTicket(value: unknown): value is StoredTicket {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.token === "string" &&
    obj.token.length >= 16 &&
    obj.token.length <= 128 &&
    (typeof obj.savedAt === "number" || obj.savedAt === undefined)
  );
}

export function rememberTicket(token: string): void {
  if (!token || token.length < 16) return;
  try {
    const list = readStoredTickets().filter(t => t.token !== token);
    list.unshift({ token, savedAt: Date.now() });
    const trimmed = list.slice(0, MAX_STORED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function readStoredTickets(): StoredTicket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: StoredTicket[] = [];
    for (const entry of parsed) {
      if (!isStoredTicket(entry)) continue;
      out.push({ token: entry.token, savedAt: typeof entry.savedAt === "number" ? entry.savedAt : 0 });
    }
    return out;
  } catch {
    return [];
  }
}

export function forgetTicket(token: string): void {
  try {
    const list = readStoredTickets().filter(t => t.token !== token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
