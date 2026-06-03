import "server-only";
import { cookies } from "next/headers";
import {
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "./jwt";
import { SESSION_COOKIE } from "./constants";

export { SESSION_COOKIE };
export type { SessionPayload };

/** Creates a signed JWT and stores it in an httpOnly session cookie. */
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload);

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** Reads and verifies the session cookie. Returns null if absent or invalid. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Clears the session cookie (logout). */
export async function clearSession(): Promise<void> {
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
