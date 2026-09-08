import React from "react";

export function parseJsonArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) =>
            typeof item === "object" ? JSON.stringify(item) : String(item)
          );
        }
        if (typeof parsed === "object" && parsed !== null) {
          return Object.entries(parsed).map(([k, v]) => `${k}: ${v}`);
        }
      } catch {}
    }
    if (trimmed.includes(",")) {
      return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (trimmed.includes("\n")) {
      return trimmed.split("\n").map((s) => s.trim()).filter(Boolean);
    }
    return [trimmed];
  }
  return [String(val)];
}

export function RenderBadges(
  val: unknown,
  colorClass = "bg-indigo-50 text-indigo-700 border-indigo-200"
) {
  const items = parseJsonArray(val);
  if (items.length === 0) return <span className="text-slate-400 text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1 max-w-xs">
      {items.map((item, idx) => (
        <span
          key={idx}
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function RenderImageGallery(val: unknown) {
  const urls = parseJsonArray(val);
  if (urls.length === 0) return <span className="text-slate-400 text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {urls.map((url, idx) => (
        <a
          key={idx}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="group relative block w-8 h-8 rounded-lg border border-slate-200 overflow-hidden hover:scale-110 transition-transform bg-slate-100 shadow-2xs"
          title={url}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="w-full h-full object-cover" />
        </a>
      ))}
    </div>
  );
}
