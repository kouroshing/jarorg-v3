import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Award } from "lucide-react";
import CoursePlayer from "./CoursePlayer";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
};

export default async function PlayPage({ params }: Props) {
  const course = await prisma.course.findUnique({
    where: { id: params.id },
  });

  if (!course) {
    notFound();
  }

  // 1. Secure Authentication Check
  const session = await getSession();
  if (!session) {
    redirect(encodeURI(`/login?redirect=/jaramooz/courses/${course.id}/play`));
  }

  // 2. Secure Authorization Check (Verifying SUCCESS Purchase)
  const purchase = await prisma.purchase.findUnique({
    where: {
      userId_courseId: {
        userId: session.userId,
        courseId: course.id,
      },
    },
  });

  if (purchase?.status !== "SUCCESS") {
    redirect(encodeURI(`/jaramooz?error=not_purchased`));
  }

  return (
    <div className="jaramooz-theme relative min-h-screen bg-slate-50 text-slate-800 overflow-hidden pt-[calc(env(safe-area-inset-top,0px)+5rem)] md:pt-[calc(env(safe-area-inset-top,0px)+6.5rem)] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-24">
      {/* Decorative Tech Blue Glow Effects */}
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] sm:w-[800px] sm:h-[800px] rounded-full bg-[#006097]/8 blur-[130px] sm:blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full bg-[#056297]/6 blur-[100px] sm:blur-[140px] pointer-events-none" />

      {/* Top Breadcrumb Nav */}
      <div className="relative z-10 mx-auto max-w-5xl px-5 md:px-8 mb-6 flex items-center justify-between">
        <Link
          href="/jaramooz"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
          توضیحات دوره
        </Link>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Award className="h-4 w-4 text-[#006097]" />
          کلاس‌های آنلاین جارآموز
        </span>
      </div>

      {/* Interactive Course Player Container */}
      <div className="relative z-10 mx-auto max-w-5xl px-5 md:px-8">
        <CoursePlayer course={course} />
      </div>
    </div>
  );
}
