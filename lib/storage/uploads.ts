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

export function getExpertUploadDir(): string {
  return path.join(getUploadRoot(), "experts");
}

/** Public URL path for an expert avatar filename. */
export function expertAvatarPublicUrl(filename: string): string {
  return `/uploads/experts/${filename}`;
}
