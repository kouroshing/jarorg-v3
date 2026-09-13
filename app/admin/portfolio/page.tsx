import { redirect } from "next/navigation";

/** Alias → canonical NextAdmin PortfolioItem list (curation gallery). */
export default function AdminPortfolioAliasPage() {
  redirect("/admin/PortfolioItem");
}
