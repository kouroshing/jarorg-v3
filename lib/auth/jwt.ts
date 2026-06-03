import { SignJWT, jwtVerify } from "jose";
import type { SessionRole } from "@/lib/auth/roles";

export type SessionPayload = {
  userId: string;
  phone: string;
  role: SessionRole;
};

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set a random string (32+ chars) in .env"
    );
  }
  return new TextEncoder().encode(secret);
}

function parseSessionRole(value: unknown): SessionRole | null {
  if (value === "admin" || value === "user") return value;
  return null;
}

export async function signSessionToken(
  payload: SessionPayload
): Promise<string> {
  return new SignJWT({
    sub: payload.userId,
    phone: payload.phone,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

/** Verifies JWT — safe for Middleware (Edge) and Route Handlers. */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = payload.sub;
    const phone = payload.phone;
    const role = parseSessionRole(payload.role);

    if (typeof userId !== "string" || typeof phone !== "string" || !role) {
      return null;
    }

    return { userId, phone, role };
  } catch {
    return null;
  }
}
