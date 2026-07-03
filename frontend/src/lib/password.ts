// Generate a readable random password (no ambiguous chars) for handoff.
export function generatePassword(len = 12): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  let out = "";
  for (const n of arr) out += chars[n % chars.length];
  return out;
}
