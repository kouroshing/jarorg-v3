import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isAdminSession } from "@/lib/auth/admin";
import { getSpecialistReviewCards } from "@/lib/specialists/review";
import SpecialistReviewBoard from "@/components/admin/SpecialistReviewBoard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "بررسی پرونده متخصصان | پنل مدیریت جار",
};

export default async function AdminSpecialistReviewPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await getSession();
  if (!isAdminSession(session)) {
    redirect("/login?redirect=/admin/review");
  }

  const filter = searchParams?.status === "all" ? "all" : "pending";
  const statuses =
    filter === "all"
      ? ["PENDING_REVIEW", "INCOMPLETE", "ACTIVE", "SUSPENDED"]
      : ["PENDING_REVIEW"];

  const cards = await getSpecialistReviewCards(statuses, {
    includeKycPending: filter === "pending",
  });

  return <SpecialistReviewBoard cards={cards} filter={filter} />;
}
