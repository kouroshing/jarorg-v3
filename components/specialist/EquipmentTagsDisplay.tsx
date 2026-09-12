"use client";

import React, { useState } from "react";
import { Camera, Smartphone } from "lucide-react";
import { findEquipmentByLabel, parseEquipmentTags } from "@/lib/equipment/catalog";

type Props = {
  value: string | null | undefined;
  emptyLabel?: string;
  className?: string;
};

function TinyThumb({ label }: { label: string }) {
  const item = findEquipmentByLabel(label);
  const [broken, setBroken] = useState(false);
  const src = item?.image;
  const Glyph = item?.category === "phone" ? Smartphone : Camera;

  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md border border-jar-border bg-jar-surface">
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={20}
          height={20}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain p-px"
          onError={() => setBroken(true)}
        />
      ) : (
        <Glyph className="h-3 w-3 text-jar-muted" />
      )}
    </span>
  );
}

export default function EquipmentTagsDisplay({
  value,
  emptyLabel = "—",
  className = "",
}: Props) {
  const tags = parseEquipmentTags(value);
  if (tags.length === 0) {
    return <span className="text-jar-muted">{emptyLabel}</span>;
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-jar-border bg-jar-canvas pl-1 pr-2.5 py-0.5 text-[11px] font-bold text-jar-primary"
        >
          <TinyThumb label={tag} />
          <span className="truncate">{tag}</span>
        </span>
      ))}
    </div>
  );
}
