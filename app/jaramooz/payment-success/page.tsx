import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { phoneToLocalDisplay } from "@/lib/auth/phone";
import SuccessClient from "./SuccessClient";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: { authority?: string };
};

export default async function PaymentSuccessPage({ searchParams }: Props) {
  const authority = searchParams.authority;

  if (!authority) {
    notFound();
  }

  // Fetch the purchase along with associated user and course details
  const purchase = await prisma.purchase.findUnique({
    where: { authority },
    include: { user: true, course: true },
  });

  if (!purchase) {
    notFound();
  }

  let finalLicenseKey = purchase.licenseKey;
  if (purchase.status === "SUCCESS" && !finalLicenseKey) {
    const { generateSpotPlayerLicense } = await import("@/lib/spotplayer");
    finalLicenseKey = await generateSpotPlayerLicense(
      purchase.userId,
      purchase.user.displayName || "",
      purchase.courseId
    );
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { licenseKey: finalLicenseKey },
    });
  }

  return (
    <div className="jaramooz-theme relative min-h-[85dvh] flex items-center justify-center bg-slate-50 text-slate-800 overflow-hidden px-4 py-8">
      {/* Decorative Tech Blue Glow Effects */}
      <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] sm:w-[650px] sm:h-[650px] rounded-full bg-[#006097]/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] sm:w-[650px] sm:h-[650px] rounded-full bg-[#056297]/6 blur-[120px] pointer-events-none" />

      {/* Centered glass widget wrapper */}
      <div className="relative z-10 w-full max-w-md flex justify-center">
        <SuccessClient
          phone={purchase.user.phone}
          localPhone={phoneToLocalDisplay(purchase.user.phone)}
          authority={purchase.authority || ""}
          courseTitle={purchase.course.title}
          courseId={purchase.course.id}
          initialLicenseKey={finalLicenseKey}
          initialStatus={purchase.status}
        />
      </div>
    </div>
  );
}
