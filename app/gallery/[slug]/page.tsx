import { redirect } from "next/navigation";

/** Public gallery sales are retired; keep route to avoid 404s. */
export default function GallerySlugPage() {
  redirect("/");
}
