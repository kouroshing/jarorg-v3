import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { JarLocationSubmitForm } from "@/components/tools/JarLocationExplorer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ثبت لوکیشن | جار لوکیشن",
  robots: { index: false, follow: false },
};

export default async function NewJarLocationPage() {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login?next=/tools/locations/new");
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 sm:px-0 py-6 pb-24 animate-fade-up">
      <div className="mb-4">
        <Link
          href="/tools/locations"
          className="text-[11px] font-bold text-jar-muted hover:text-jar-primary"
        >
          ← جار لوکیشن
        </Link>
      </div>
      <JarLocationSubmitForm />
    </div>
  );
}
