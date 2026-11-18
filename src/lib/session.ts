const encoder = new TextEncoder();

async function hmacHex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualStr(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function createSessionToken(secret: string, maxAgeSec = 60 * 60 * 24 * 7) {
  const exp = Date.now() + maxAgeSec * 1000;
  const payload = `ok:${exp}`;
  const sig = await hmacHex(secret, payload);
  return `${payload}.${sig}`;
}

export async function isValidSessionToken(token: string | undefined, secret: string) {
  if (!token || !secret) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = await hmacHex(secret, payload);
  if (!timingSafeEqualStr(sig, expected)) return false;
  const exp = Number(payload.split(":")[1]);
  return Boolean(exp && Date.now() <= exp);
}
