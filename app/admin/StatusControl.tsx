"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { updateProjectLead } from "@/app/actions/projectActions";
import { ADMIN_STATUSES, STATUS_META, type AdminStatus } from "@/lib/projects/status";

export function StatusControl({
  projectId,
  status,
}: {
  projectId: string;
  status: AdminStatus;
}) {
  const [isPending, startTransition] = useTransition();

  const onChange = (next: AdminStatus) => {
    if (next === status || isPending) return;
    startTransition(async () => {
      await updateProjectLead({ id: projectId, status: next });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="text-xs font-medium text-gray-500">وضعیت:</label>
      <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
        <select
          value={status}
          onChange={(e) => onChange(e.target.value as AdminStatus)}
          disabled={isPending}
          className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 pe-10 text-sm font-semibold text-black outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[#FACC15] disabled:opacity-60"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "left 0.65rem center",
            backgroundSize: "1rem",
          }}
        >
          {ADMIN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
        {isPending && (
          <Loader2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-jar-yellow" />
        )}
      </div>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_META[status].active}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[status].dot}`} />
        {STATUS_META[status].label}
      </span>
    </div>
  );
}
