"use client";

import { Inbox } from "lucide-react";
import { LeadCard } from "@/components/admin/LeadCard";
import type { AdminProjectRecord } from "@/app/actions/projectActions";

export function ProjectsLeadBoard({
  initialProjects,
}: {
  initialProjects: AdminProjectRecord[];
}) {
  if (initialProjects.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center shadow-sm">
        <Inbox className="h-10 w-10 text-gray-300" strokeWidth={1.25} />
        <p className="mt-4 text-sm text-gray-500">هنوز لیدی ثبت نشده است.</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {initialProjects.map((project) => (
        <li key={project.id} className="min-h-0">
          <LeadCard project={project} />
        </li>
      ))}
    </ul>
  );
}
