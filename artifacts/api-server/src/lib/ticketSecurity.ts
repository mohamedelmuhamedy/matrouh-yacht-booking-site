import crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function getSecret(): string {
  const s = process.env.SESSION_SECRET || process.env.JWT_SECRET || "";
  if (!s) throw new Error("SESSION_SECRET (or JWT_SECRET) is required for ticket signing");
  return s;
}

function bufferToBase32(buf: Buffer, chars: number): string {
  let bits = "";
  for (const b of buf) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length && out.length < chars; i += 5) {
    out += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
}

function checksumOf(input: string): string {
  const h = crypto.createHash("sha256").update(input).digest();
  return bufferToBase32(h, 2);
}

export function generateTicketNumber(bookingId: number, seedHex: string): string {
  const year = new Date().getFullYear() % 100;
  const seed = (seedHex || crypto.randomBytes(8).toString("hex")).toUpperCase();
  const core = bufferToBase32(Buffer.from(seed.slice(0, 12), "hex").length ? Buffer.from(seed.slice(0, 12), "hex") : crypto.randomBytes(6), 6);
  const idPart = String(bookingId).padStart(4, "0").slice(-4);
  const body = `${idPart}${core}`;
  const ck = checksumOf(`DR-${year}-${body}`);
  return `DR-${year}-${body}-${ck}`;
}

export function verifyTicketNumberChecksum(num: string): boolean {
  const m = /^DR-(\d{2})-([A-Z0-9]+)-([A-Z0-9]{2})$/.exec(num || "");
  if (!m) return false;
  const expected = checksumOf(`DR-${m[1]}-${m[2]}`);
  return expected === m[3];
}

export function signTicket(payload: { bookingId: number; ticketToken: string; ticketNumber: string }): string {
  const data = `${payload.bookingId}|${payload.ticketToken}|${payload.ticketNumber}`;
  const mac = crypto.createHmac("sha256", getSecret()).update(data).digest();
  return bufferToBase32(mac, 12);
}

export function verifyTicketSignature(
  payload: { bookingId: number; ticketToken: string; ticketNumber: string },
  signature: string,
): boolean {
  if (!signature) return false;
  const expected = signTicket(payload);
  if (expected.length !== signature.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature.toUpperCase()));
  } catch {
    return false;
  }
}
