"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  UserCircle,
} from "lucide-react";
import {
  createExpert,
  updateExpert,
  deleteExpert,
  type ExpertRecord,
} from "@/app/actions/expertActions";
import { ImageUploadCropper } from "@/components/admin/ImageUploadCropper";

type ExpertFormState = {
  name: string;
  imageUrl: string;
  description: string;
  isActive: boolean;
};

const EMPTY_FORM: ExpertFormState = {
  name: "",
  imageUrl: "",
  description: "",
  isActive: true,
};

function expertToForm(expert: ExpertRecord): ExpertFormState {
  return {
    name: expert.name,
    imageUrl: expert.imageUrl,
    description: expert.description,
    isActive: expert.isActive,
  };
}

export function ExpertsManager({ initialExperts }: { initialExperts: ExpertRecord[] }) {
  const [experts, setExperts] = useState(initialExperts);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpertFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (expert: ExpertRecord) => {
    setEditingId(expert.id);
    setForm(expertToForm(expert));
    setError(null);
    setModalOpen(true);
  };

  const resetModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const closeModal = () => {
    if (isPending) return;
    resetModal();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = {
        name: form.name,
        imageUrl: form.imageUrl,
        description: form.description,
        isActive: form.isActive,
      };

      const result = editingId
        ? await updateExpert({ id: editingId, ...payload })
        : await createExpert(payload);

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (editingId) {
        setExperts((prev) =>
          prev.map((ex) => (ex.id === editingId ? result.expert : ex))
        );
      } else {
        setExperts((prev) => [result.expert, ...prev]);
      }
      resetModal();
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`متخصص «${name}» حذف شود؟`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteExpert({ id });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setExperts((prev) => prev.filter((ex) => ex.id !== id));
    });
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {experts.length} متخصص ثبت‌شده
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-full bg-[#FACC15] px-5 py-2.5 text-sm font-bold text-black shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-95"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          افزودن متخصص جدید
        </button>
      </div>

      {error && !modalOpen && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          {error}
        </p>
      )}

      {experts.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <UserCircle className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">
            هنوز متخصصی ثبت نشده است.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-6 text-sm font-semibold text-black underline-offset-4 hover:underline"
          >
            اولین متخصص را اضافه کنید
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="hidden border-b border-gray-100 bg-gray-50/80 px-4 py-3 text-xs font-medium text-gray-500 sm:grid sm:grid-cols-[minmax(0,1fr)_auto]">
            <span>متخصص</span>
            <span className="text-left">عملیات</span>
          </div>
          <ul className="divide-y divide-gray-100">
            {experts.map((expert) => (
              <li
                key={expert.id}
                className="flex flex-col gap-4 px-4 py-4 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-100">
                    {expert.imageUrl.startsWith("/") ? (
                      <Image
                        src={expert.imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={expert.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-sm font-bold text-black">
                        {expert.name}
                      </h2>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          expert.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {expert.isActive ? "فعال" : "غیرفعال"}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">
                      {expert.description}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => openEdit(expert)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    ویرایش
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(expert.id, expert.name)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50/50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 backdrop-blur-[2px] sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="expert-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="بستن"
            onClick={closeModal}
          />

          <form
            onSubmit={handleSubmit}
            className="relative z-10 w-full max-w-md rounded-2xl border border-gray-100 bg-white p-5 shadow-xl sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2
                id="expert-modal-title"
                className="text-lg font-bold text-black"
              >
                {editingId ? "ویرایش متخصص" : "افزودن متخصص جدید"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50"
                aria-label="بستن فرم"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-gray-600">
                  نام متخصص
                </span>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm text-black outline-none transition-all focus:ring-2 focus:ring-[#FACC15]"
                  placeholder="مثلاً سارا محمدی"
                />
              </label>

              <ImageUploadCropper
                value={form.imageUrl}
                onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
                disabled={isPending}
              />
              {!form.imageUrl && (
                <p className="text-[11px] text-amber-700">
                  برای ذخیره، یک عکس پروفایل انتخاب کنید.
                </p>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-gray-600">
                  توضیحات تخصص
                </span>
                <textarea
                  required
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full resize-none rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm leading-relaxed text-black outline-none transition-all focus:ring-2 focus:ring-[#FACC15]"
                  placeholder="عکاس پرتره و محصول..."
                />
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-[#FACC15] focus:ring-[#FACC15]"
                />
                <span className="text-sm font-medium text-black">
                  نمایش در سایت
                </span>
              </label>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600"
              >
                {error}
              </p>
            )}

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={isPending || !form.imageUrl.trim()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FACC15] py-3 text-sm font-bold text-black transition-all hover:brightness-95 disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    در حال ذخیره
                  </>
                ) : editingId ? (
                  "ذخیره تغییرات"
                ) : (
                  "افزودن"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
