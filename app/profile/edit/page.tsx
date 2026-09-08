import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { phoneToLocalDisplay } from "@/lib/auth/phone";
import EditProfileForm from "./EditProfileForm";

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect(encodeURI("/login?redirect=/profile/edit"));
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });

  if (!user) {
    redirect(encodeURI("/profile"));
  }

  const phoneDisplay = phoneToLocalDisplay(session.phone);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <EditProfileForm 
        initialName={user.displayName || ""} 
        phoneDisplay={phoneDisplay}
      />
    </div>
  );
}
