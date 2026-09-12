"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Aperture,
  Camera,
  Flashlight,
  Mic,
  Plane,
  Plus,
  Search,
  Smartphone,
  Sparkles,
  SunMedium,
  Wrench,
  X,
} from "lucide-react";
import {
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_LIMITS,
  type EquipmentCatalogMode,
  type EquipmentCategory,
  type EquipmentItem,
  findEquipmentByLabel,
  searchEquipmentCatalog,
} from "@/lib/equipment/catalog";

type Props = {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  /** pro = cameras/lenses; mobile = phones + phone accessories */
  mode?: EquipmentCatalogMode;
};

function CategoryGlyph({
  category,
  className = "h-3.5 w-3.5",
}: {
  category?: EquipmentCategory;
  className?: string;
}) {
  switch (category) {
    case "camera":
      return <Camera className={className} />;
    case "lens":
      return <Aperture className={className} />;
    case "light":
      return <SunMedium className={className} />;
    case "flash":
      return <Flashlight className={className} />;
    case "microphone":
      return <Mic className={className} />;
    case "gimbal":
      return <Sparkles className={className} />;
    case "drone":
      return <Plane className={className} />;
    case "phone":
      return <Smartphone className={className} />;
    case "support":
      return <Wrench className={className} />;
    default:
      return <Camera className={className} />;
  }
}

function EquipmentThumb({
  item,
  size = 28,
}: {
  item?: EquipmentItem | null;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(item?.image) && !broken;

  return (
    <span
      className="relative shrink-0 overflow-hidden rounded-lg border border-jar-border bg-jar-canvas text-jar-muted flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- tiny remote catalog thumbs
        <img
          src={item!.image}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain p-0.5"
          onError={() => setBroken(true)}
        />
      ) : (
        <CategoryGlyph category={item?.category} className="h-3.5 w-3.5 opacity-70" />
      )}
    </span>
  );
}

export default function EquipmentMultiSelect({
  value,
  onChange,
  placeholder,
  mode = "pro",
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const resolvedPlaceholder =
    placeholder ||
    (mode === "mobile"
      ? "جستجو: iPhone 15 Pro، Galaxy S24 Ultra، DJI OM 6..."
      : "جستجو: Sony A7، Godox AD400، DJI RS 4...");

  const suggestions = useMemo(
    () => searchEquipmentCatalog(query, { exclude: value, limit: 20, mode }),
    [query, value, mode]
  );

  const canCreate =
    query.trim().length >= 2 &&
    !value.some((tag) => tag.toLowerCase() === query.trim().toLowerCase()) &&
    !suggestions.some((item) => item.label.toLowerCase() === query.trim().toLowerCase());

  const options: Array<{ kind: "create" | "item"; label: string; item?: EquipmentItem }> = [];
  if (canCreate) {
    options.push({ kind: "create", label: query.trim() });
  }
  for (const item of suggestions) {
    options.push({ kind: "item", label: item.label, item });
  }

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const addTag = (raw: string) => {
    const label = raw.trim();
    if (!label) return;
    if (value.length >= EQUIPMENT_LIMITS.maxTags) return;
    if (value.some((tag) => tag.toLowerCase() === label.toLowerCase())) {
      setQuery("");
      return;
    }
    onChange([...value, label]);
    setQuery("");
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((item) => item !== tag));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !query && value.length > 0) {
      event.preventDefault();
      removeTag(value[value.length - 1]);
      return;
    }

    if (event.key === "ArrowDown") {
      if (!open && query.trim()) setOpen(true);
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, options.length - 1)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (open && options[activeIndex]) {
        addTag(options[activeIndex].label);
        return;
      }
      if (query.trim().length >= 2) {
        addTag(query);
      }
    }
  };

  return (
    <div ref={rootRef} className="relative space-y-2">
      <div
        className="min-h-12 w-full rounded-2xl border border-jar-border bg-jar-canvas px-3 py-2 focus-within:bg-jar-surface focus-within:border-jar-logo focus-within:ring-4 focus-within:ring-jar-logo/10 transition-all cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {value.map((tag) => {
            const matched = findEquipmentByLabel(tag);
            return (
              <span
                key={tag}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-jar-border bg-jar-surface pl-1 pr-2 py-0.5 text-[11px] font-bold text-jar-primary"
              >
                <EquipmentThumb item={matched} size={20} />
                <span className="truncate">{tag}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(tag);
                  }}
                  className="rounded-full p-0.5 text-jar-muted hover:bg-jar-soft hover:text-jar-primary"
                  aria-label={`حذف ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}

          <div className="relative flex min-w-[10rem] flex-1 items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-jar-muted shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => {
                if (query.trim()) setOpen(true);
              }}
              onKeyDown={onKeyDown}
              placeholder={value.length === 0 ? resolvedPlaceholder : "افزودن وسیله دیگر..."}
              className="w-full bg-transparent py-1.5 text-xs font-medium text-jar-primary outline-none placeholder:text-jar-muted/70"
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      {open && query.trim().length > 0 && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-2xl border border-jar-border bg-jar-surface shadow-lg"
        >
          {options.length === 0 ? (
            <p className="px-3 py-3 text-[11px] text-jar-muted font-medium">
              نتیجه‌ای پیدا نشد. Enter بزنید تا «{query.trim()}» اضافه شود.
            </p>
          ) : (
            <ul className="py-1">
              {options.map((option, index) => {
                const active = index === activeIndex;
                return (
                  <li key={`${option.kind}-${option.label}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => addTag(option.label)}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-right transition-colors ${
                        active ? "bg-jar-soft" : "hover:bg-jar-canvas"
                      }`}
                    >
                      <span className="min-w-0 flex items-center gap-2.5">
                        {option.kind === "create" ? (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-jar-logo/20 bg-jar-logo/10 text-jar-logo">
                            <Plus className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <EquipmentThumb item={option.item} size={28} />
                        )}
                        <span className="truncate text-xs font-bold text-jar-primary">
                          {option.kind === "create" ? `افزودن «${option.label}»` : option.label}
                        </span>
                      </span>
                      {option.item ? (
                        <span className="shrink-0 rounded-full bg-jar-canvas px-2 py-0.5 text-[10px] font-bold text-jar-muted">
                          {EQUIPMENT_CATEGORY_LABELS[option.item.category]}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-jar-logo/10 px-2 py-0.5 text-[10px] font-bold text-jar-logo">
                          سفارشی
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <p className="text-[10px] text-jar-muted">
        چند حرف تایپ کنید و انتخاب کنید، یا Enter بزنید تا وسیله‌ای که در لیست نیست اضافه شود.
        {value.length > 0 ? ` (${value.length} مورد)` : ""}
      </p>
    </div>
  );
}
