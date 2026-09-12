import { createHandler } from "@premieroctet/next-admin/appHandler";
import { prisma } from "@/lib/prisma";
import { options } from "@/lib/admin/options";
import { getSession } from "@/lib/auth/session";
import {
  canAccessNextAdminModel,
  resolveAdminAccess,
} from "@/lib/auth/adminAccess";
import { NextResponse } from "next/server";

const { run } = createHandler({
  apiBasePath: "/api/admin",
  prisma,
  options,
});

/** Extract Prisma model name from /api/admin/{Model}/... */
function modelFromRequest(req: Request): string | null {
  try {
    const { pathname } = new URL(req.url);
    const rest = pathname.replace(/^\/api\/admin\/?/, "");
    const segment = rest.split("/").filter(Boolean)[0];
    if (!segment || segment === "actions") return null;
    return segment;
  } catch {
    return null;
  }
}

async function authorizeAdminApi(req: Request) {
  const session = await getSession();
  const access = await resolveAdminAccess(session);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const model = modelFromRequest(req);
  if (model && !canAccessNextAdminModel(access, model)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

export const GET = async (req: Request, ctx: any) => {
  const denied = await authorizeAdminApi(req);
  if (denied) return denied;
  return run(req, ctx);
};

export const POST = async (req: Request, ctx: any) => {
  const denied = await authorizeAdminApi(req);
  if (denied) return denied;
  return run(req, ctx);
};

export const DELETE = async (req: Request, ctx: any) => {
  const denied = await authorizeAdminApi(req);
  if (denied) return denied;
  return run(req, ctx);
};
