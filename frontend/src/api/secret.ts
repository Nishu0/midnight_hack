// shared per-user secret key + byte helpers. notes and orders are owned by the same
// key so the vault can escrow a trader's orders later.

export const randomBytes = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n));

export const toHex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
export const fromHex = (h: string): Uint8Array =>
  new Uint8Array((h.match(/.{1,2}/g) ?? []).map((x) => parseInt(x, 16)));

export const loadSecretKey = (): Uint8Array => {
  const stored = localStorage.getItem("nightpool.sk");
  if (stored) return Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
  const sk = randomBytes(32);
  localStorage.setItem("nightpool.sk", btoa(String.fromCharCode(...sk)));
  return sk;
};
