import path from "path";

/**
 * Root for user-uploaded files. On Liara, mount a persistent disk to `public/uploads`.
 * Override with UPLOAD_ROOT if the mount path differs.
 */
export function getUploadRoot(): string {
  const custom = process.env.UPLOAD_ROOT?.trim();
  if (custom) return path.resolve(custom);
  const cwd = process.cwd();
  if (cwd.endsWith(path.join(".next", "standalone"))) {
    return path.join(cwd, "..", "..", "public", "uploads");
  }
  return path.join(cwd, "public", "uploads");
}

/**
 * Map a public `/uploads/...` URL to an absolute disk path under getUploadRoot().
 * Returns null for unsafe / non-upload paths.
 */
export function resolveUploadDiskPath(publicUrl: string): string | null {
  if (!publicUrl.startsWith("/uploads/")) return null;
  const relative = publicUrl.slice("/uploads/".length);
  const parts = relative.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.some((p) => p === ".." || p.includes("\0") || path.isAbsolute(p))) {
    return null;
  }
  if (parts[0] === "gallery") return null;

  const root = path.resolve(getUploadRoot());
  const full = path.resolve(root, ...parts);
  if (!full.startsWith(root + path.sep) && full !== root) return null;
  return full;
}
