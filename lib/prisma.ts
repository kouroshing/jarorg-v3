import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma client for server-side use (Server Components, Actions, Route Handlers).
 * Reuses one instance in development to avoid exhausting DB connections during HMR.
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
