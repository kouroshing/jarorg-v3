import { createHandler } from "@premieroctet/next-admin/appHandler";
import { prisma } from "@/lib/prisma";
import { options } from "@/lib/admin/options";
import { getSession } from "@/lib/auth/session";
import { isAdminSession } from "@/lib/auth/admin";
import { NextResponse } from "next/server";

const { run } = createHandler({
  apiBasePath: "/api/admin",
  prisma,
  options,
  onRequest: async () => {
    const session = await getSession();
    if (!isAdminSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  },
});

export const GET = async (req: Request, ctx: any) => {
  const session = await getSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return run(req, ctx);
};

export const POST = async (req: Request, ctx: any) => {
  const session = await getSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return run(req, ctx);
};

export const DELETE = async (req: Request, ctx: any) => {
  const session = await getSession();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return run(req, ctx);
};
