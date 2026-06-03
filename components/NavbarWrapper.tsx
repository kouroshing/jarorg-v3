import { getSession } from "@/lib/auth/session";
import { Navbar, type AuthStatus } from "@/components/Navbar";

function resolveAuthStatus(session: Awaited<ReturnType<typeof getSession>>): AuthStatus {
  if (!session) return "guest";
  return session.role === "admin" ? "admin" : "user";
}

/** Server wrapper: passes verified session into the client Navbar (no auth flash). */
export async function NavbarWrapper() {
  const session = await getSession();
  return <Navbar initialAuth={resolveAuthStatus(session)} />;
}
