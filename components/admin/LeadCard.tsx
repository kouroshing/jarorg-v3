"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Loader2, Phone } from "lucide-react";
import {
  updateProjectNote,
  updateProjectStatus,
  type AdminProjectRecord,
} from "@/app/actions/projectActions";
import { getBudgetLabel } from "@/lib/projects/budget";
import { getProjectServiceLabel } from "@/lib/projects/services";
import {
  ADMIN_STATUSES,
  STATUS_META,
  normalizeStatus,
  type AdminStatus,
} from "@/lib/projects/status";
import { phoneToLocalDisplay } from "@/lib/auth/phone";

const STATUS_BADGE: Record<AdminStatus, string> = {
  PENDING: "border-yellow-200 bg-yellow-50 text-yellow-800",
  IN_PROGRESS: "border-blue-200 bg-blue-50 text-blue-800",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CANCELED: "border-gray-200 bg-gray-100 text-gray-600",
};

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
  timeStyle: "short",
});

type LeadCardProps = {
  project: AdminProjectRecord;
};

export function LeadCard({ project }: LeadCardProps) {
  const [status, setStatus] = useState<AdminStatus>(
    normalizeStatus(project.status)
  );
  const [notes, setNotes] = useState(project.adminNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<"status" | "notes" | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!saveSuccess) return;
    const timer = setTimeout(() => setSaveSuccess(null), 2500);
    return () => clearTimeout(timer);
  }, [saveSuccess]);

  const serviceLabel = getProjectServiceLabel(
    project.serviceType,
    project.serviceDetails
  );
  const displayPhone = project.contactPhone
    ? phoneToLocalDisplay(project.contactPhone)
    : null;
  const telHref = displayPhone
    ? `tel:${displayPhone.replace(/\s/g, "")}`
    : undefined;

  const onStatusChange = (next: AdminStatus) => {
    if (next === status || isPending) return;
    setError(null);
    setSaveSuccess(null);
    startTransition(async () => {
      const result = await updateProjectStatus({ id: project.id, status: next });
      if (!result.success) {
        setError(result.error ?? "خطا در بروزرسانی وضعیت.");
        return;
      }
      setStatus(next);
      setSaveSuccess("status");
    });
  };

  const onSaveNotes = () => {
    setError(null);
    setSaveSuccess(null);
    startTransition(async () => {
      const result = await updateProjectNote({
        id: project.id,
        adminNotes: notes,
      });
      if (!result.success) {
        setError(result.error ?? "خطا در ذخیره یادداشت.");
        return;
      }
      setSaveSuccess("notes");
    });
  };

  return (
    <article className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 flex-1 text-base font-bold leading-snug text-black">
          {serviceLabel}
        </h2>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE[status]}`}
        >
          {STATUS_META[status].label}
        </span>
      </header>

      <div className="mt-4 space-y-2.5 text-sm">
        {displayPhone && telHref && (
          <p>
            <span className="text-xs text-gray-500">تماس</span>
            <a
              href={telHref}
              dir="ltr"
              className="mt-0.5 flex items-center gap-1.5 font-semibold text-[#CA8A04] transition-colors hover:text-[#A16207]"
            >
              <Phone className="h-4 w-4 shrink-0" strokeWidth={2} />
              {displayPhone}
            </a>
          </p>
        )}

        {project.contactName && (
          <p className="text-xs text-gray-600">
            <span className="text-gray-400">نام: </span>
            {project.contactName}
          </p>
        )}

        <p className="text-xs text-gray-600">
          <span className="text-gray-400">بودجه: </span>
          {getBudgetLabel(project.budget)}
        </p>

        <p className="text-xs text-gray-500">
          {dateFormatter.format(new Date(project.createdAt))}
        </p>

        {project.expert && (
          <p className="text-xs text-gray-600">
            <span className="text-gray-400">متخصص: </span>
            {project.expert.name}
          </p>
        )}
      </div>

      {project.brief?.trim() && (
        <p className="mt-4 whitespace-pre-wrap rounded-xl bg-gray-50 px-3.5 py-3 text-xs leading-relaxed text-gray-700">
          {project.brief}
        </p>
      )}

      {project.referenceLink?.trim() && (
        <a
          href={project.referenceLink}
          target="_blank"
          rel="noopener noreferrer"
          dir="ltr"
          className="mt-3 block truncate text-xs font-medium text-[#CA8A04] hover:underline"
        >
          {project.referenceLink}
        </a>
      )}

      <div className="mt-auto border-t border-gray-100/80 pt-4">
        <div className="space-y-4">
          <div>
            <label
              htmlFor={`status-${project.id}`}
              className="mb-1.5 block text-[11px] font-medium text-gray-500"
            >
              وضعیت
            </label>
            <select
              id={`status-${project.id}`}
              value={status}
              onChange={(e) => onStatusChange(e.target.value as AdminStatus)}
              disabled={isPending}
              className="w-full rounded-xl border border-gray-100 bg-white px-3 py-2 text-sm font-medium text-black outline-none transition-shadow focus:ring-1 focus:ring-[#FACC15] disabled:opacity-50"
            >
              {ADMIN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
            {saveSuccess === "status" && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                وضعیت ذخیره شد
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor={`notes-${project.id}`}
              className="mb-1.5 block text-[11px] font-medium text-gray-500"
            >
              یادداشت داخلی
            </label>
            <textarea
              id={`notes-${project.id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="پیگیری تماس، پیشنهاد قیمت..."
              disabled={isPending}
              className="w-full resize-none rounded-xl border-none bg-gray-50 px-3.5 py-3 text-sm leading-relaxed text-black outline-none focus:ring-1 focus:ring-[#FACC15] disabled:opacity-60"
            />
            <button
              type="button"
              onClick={onSaveNotes}
              disabled={isPending}
              className="mt-2 text-xs font-semibold text-gray-600 transition-colors hover:text-black disabled:opacity-50"
            >
              {isPending ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  در حال ذخیره
                </span>
              ) : (
                "ذخیره یادداشت"
              )}
            </button>
            {saveSuccess === "notes" && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                یادداشت ذخیره شد
              </p>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
