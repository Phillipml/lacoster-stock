import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";
import { createSessionToken } from "@/lib/session";

const COOKIE = "lacoster_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET não definida no .env");
  return s;
}

export function validateCredentials(user: string, password: string) {
  const expectedUser = process.env.AUTH_USER ?? "";
  const expectedPass = process.env.AUTH_PASSWORD ?? "";
  if (!expectedUser || !expectedPass) {
    throw new Error("AUTH_USER / AUTH_PASSWORD não definidos no .env");
  }

  const uOk =
    user.length === expectedUser.length &&
    timingSafeEqual(Buffer.from(user), Buffer.from(expectedUser));
  const pOk =
    password.length === expectedPass.length &&
    timingSafeEqual(Buffer.from(password), Buffer.from(expectedPass));

  return uOk && pOk;
}

export async function createSession() {
  const token = await createSessionToken(secret(), MAX_AGE);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}
