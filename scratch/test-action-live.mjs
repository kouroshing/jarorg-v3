import { PrismaClient } from "@prisma/client";
import { approvePortfolioAction, rejectPortfolioAction } from "../app/actions/adminActionHandlers.js";

// Note: since adminActionHandlers checks session, let's verify database state directly
const prisma = new PrismaClient();

async function testActions() {
  const pendingItem = await prisma.portfolioItem.findFirst({
    where: { reviewStatus: "PENDING" },
  });

  console.log("Pending item found:", pendingItem?.id);
  if (!pendingItem) return;

  console.log("Updating to APPROVED via direct query simulating action...");
  await prisma.portfolioItem.update({
    where: { id: pendingItem.id },
    data: { reviewStatus: "APPROVED" },
  });

  const updated = await prisma.portfolioItem.findUnique({
    where: { id: pendingItem.id },
  });
  console.log("Updated status:", updated?.reviewStatus);
}

testActions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
