"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Camera, Loader2, Search, UserRound, X } from "lucide-react";
import { searchLocationPhotographersAction } from "@/app/actions/locationActions";
import type { LocationPhotographerOption } from "@/app/actions/locationActions";

export type LocationPhotographerValue = {
  photographerUserId: string | null;
  photographerName: string | null;
};

export type SelfSpecialistOption = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export function LocationPhotographerPicker({
  value,
  onChange,
  selfSpecialist,
  compact = false,
}: {
  value: LocationPhotographerValue;
  onChange: (next: LocationPhotographerValue) => void;
  selfSpecialist?: SelfSpecialistOption | null;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<LocationPhotographerOption[]>([]);
  const [isPending, startTransition] = useTransition();
  const [picked, setPicked] = useState<LocationPhotographerOption | null>(null);

  const mode: "self" | "search" | "name" | "none" = value.photographerUserId
    ? selfSpecialist && value.photographerUserId === selfSpecialist.id
      ? "self"
      : "search"
    : value.photographerName
      ? "name"
      : "none";

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        const res = await searchLocationPhotographersAction(q);
        if (res.success) setHits(res.items);
      });
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const chips = useMemo(() => {
    const list: { id: "self" | "search" | "name" | "none"; label: string }[] = [];
    if (selfSpecialist) list.push({ id: "self", label: "عکس‌های خودم" });
    list.push({ id: "search", label: "متخصص جار" });
    list.push({ id: "name", label: "نام آزاد" });
    list.push({ id: "none", label: "بدون اعتبار" });
    return list;
  }, [selfSpecialist]);

  const setMode = (next: typeof mode) => {
    if (next === "self" && selfSpecialist) {
      onChange({ photographerUserId: selfSpecialist.id, photographerName: null });
      setPicked(null);
      setQuery("");
      return;
    }
    if (next === "none") {
      onChange({ photographerUserId: null, photographerName: null });
      setPicked(null);
      setQuery("");
      return;
    }
    if (next === "name") {
      onChange({ photographerUserId: null, photographerName: value.photographerName || "" });
      setPicked(null);
      setQuery("");
      return;
    }
    onChange({ photographerUserId: null, photographerName: null });
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-2.5"} dir="rtl">
      <div className="flex items-center gap-1.5">
        <Camera className="h-3.5 w-3.5 text-jar-muted" />
        <p className="text-[11px] font-bold text-jar-primary">عکس و ویدیو کار کدام متخصص است؟</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setMode(c.id)}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors ${
              mode === c.id
                ? "border-jar-primary bg-jar-primary text-white"
                : "border-jar-border bg-white text-jar-muted hover:border-jar-primary/40"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {mode === "self" && selfSpecialist && (
        <div className="flex items-center gap-2 rounded-xl border border-jar-border bg-jar-soft/60 px-3 py-2">
          <CreditAvatar src={selfSpecialist.avatarUrl} />
          <div className="min-w-0">
            <p className="text-[12px] font-black text-jar-primary truncate">{selfSpecialist.name}</p>
            <p className="text-[10px] text-jar-muted">در صفحه لوکیشن به‌عنوان عکاس نمایش داده می‌شود</p>
          </div>
        </div>
      )}

      {mode === "search" && (
        <div className="space-y-2">
          {(picked || (value.photographerUserId && value.photographerUserId !== selfSpecialist?.id)) && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-jar-border bg-white px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <CreditAvatar src={picked?.avatarUrl || null} />
                <p className="truncate text-[12px] font-bold text-jar-primary">
                  {picked?.name || "متخصص انتخاب‌شده"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPicked(null);
                  onChange({ photographerUserId: null, photographerName: null });
                }}
                className="rounded-full p-1 text-jar-muted hover:bg-jar-soft"
                aria-label="حذف"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <label className="relative block">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-jar-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی نام متخصص…"
              className="w-full rounded-xl border border-jar-border bg-white py-2 pr-9 pl-3 text-xs"
            />
          </label>
          {isPending && (
            <p className="inline-flex items-center gap-1.5 text-[10px] font-bold text-jar-muted">
              <Loader2 className="h-3 w-3 animate-spin" />
              در حال جستجو…
            </p>
          )}
          {hits.length > 0 && (
            <ul className="max-h-44 overflow-y-auto rounded-xl border border-jar-border bg-white divide-y divide-jar-border">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setPicked(hit);
                      setQuery("");
                      setHits([]);
                      onChange({ photographerUserId: hit.id, photographerName: null });
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-right hover:bg-jar-soft"
                  >
                    <CreditAvatar src={hit.avatarUrl} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-bold text-jar-primary">
                        {hit.name}
                      </span>
                      {hit.city && (
                        <span className="block text-[10px] text-jar-muted">{hit.city}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {mode === "name" && (
        <input
          value={value.photographerName || ""}
          onChange={(e) =>
            onChange({ photographerUserId: null, photographerName: e.target.value })
          }
          placeholder="مثلاً استودیو نور / نام عکاس"
          className="w-full rounded-xl border border-jar-border bg-white px-3 py-2 text-xs"
        />
      )}
    </div>
  );
}

function CreditAvatar({ src }: { src: string | null }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
    );
  }
  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-jar-soft text-jar-muted">
      <UserRound className="h-4 w-4" />
    </span>
  );
}
