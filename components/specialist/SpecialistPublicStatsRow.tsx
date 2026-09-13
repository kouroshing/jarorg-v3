import { Briefcase, Star } from "lucide-react";

type Props = {
  completedProjects: number;
  approvedPortfolio?: number;
  className?: string;
};

/**
 * Compact trust row for client-facing specialist surfaces.
 * No fabricated star scores — only real completed Jar projects,
 * with a clear empty state for newcomers.
 */
export default function SpecialistPublicStatsRow({
  completedProjects,
  approvedPortfolio,
  className = "",
}: Props) {
  const projectsLabel =
    completedProjects > 0
      ? `${completedProjects.toLocaleString("fa-IR")} پروژه در جار`
      : "تازه‌وارد جار";

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      dir="rtl"
    >
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-jar-border bg-jar-canvas px-2.5 py-1.5 text-[11px] font-bold text-jar-primary">
        <Briefcase className="h-3.5 w-3.5 text-jar-logo shrink-0" />
        {projectsLabel}
      </span>
      {completedProjects > 0 ? (
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-950">
          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400 shrink-0" />
          عضو فعال
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-jar-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-jar-muted">
          <Star className="h-3.5 w-3.5 text-jar-muted shrink-0" />
          هنوز امتیازی ثبت نشده
        </span>
      )}
      {typeof approvedPortfolio === "number" && approvedPortfolio > 0 ? (
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-jar-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-jar-muted">
          {approvedPortfolio.toLocaleString("fa-IR")} نمونه‌کار
        </span>
      ) : null}
    </div>
  );
}
