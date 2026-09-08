import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CreditCard, Check, X, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: { authority?: string };
};

function formatPrice(price: number): string {
  return price.toLocaleString("fa-IR") + " تومان";
}

export default async function MockGatewayPage({ searchParams }: Props) {
  const authority = searchParams.authority;

  if (!authority) {
    notFound();
  }

  // Fetch the purchase info to display details on the gateway screen
  const purchase = await prisma.purchase.findUnique({
    where: { authority },
    include: { course: true },
  });

  if (!purchase) {
    notFound();
  }

  return (
    <div className="min-h-[80dvh] flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-black p-6 text-center text-white">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-jar-yellow/10 text-jar-yellow ring-1 ring-jar-yellow/20">
            <CreditCard className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-base font-bold">شبیه‌ساز پرداخت زرین‌پال (جارآموز)</h1>
          <p className="mt-1 text-[10px] text-gray-400">محیط تست محلی و ایمن پرداخت الکترونیک</p>
        </div>

        {/* Invoice Info */}
        <div className="p-6 border-b border-gray-50 space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>دوره در حال خرید:</span>
            <span className="font-semibold text-gray-900">{purchase.course.title}</span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>مبلغ تراکنش:</span>
            <span className="font-bold text-black">{formatPrice(purchase.amount || purchase.course.price)}</span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>کد مرجع (Authority):</span>
            <span className="font-mono text-gray-900 select-all" dir="ltr">{purchase.authority}</span>
          </div>
        </div>

        {/* Simulation Actions */}
        <div className="p-6 space-y-3">
          <a
            href={`/api/jaramooz/payment/verify?Authority=${purchase.authority}&Status=OK`}
            className="w-full flex h-12 items-center justify-center gap-2 rounded-xl bg-green-600 text-white text-xs font-bold transition-colors hover:bg-green-700 active:scale-98"
          >
            <Check className="h-4 w-4" />
            شبیه‌سازی تراکنش موفق (پرداخت موفق)
          </a>

          <a
            href={`/api/jaramooz/payment/verify?Authority=${purchase.authority}&Status=NOK`}
            className="w-full flex h-12 items-center justify-center gap-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold transition-colors hover:bg-red-100 active:scale-98"
          >
            <X className="h-4 w-4" />
            شبیه‌سازی انصراف کاربر (پرداخت ناموفق)
          </a>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center text-[10px] text-gray-400 flex items-center justify-center gap-1">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <span>این تراکنش فرضی است و هیچ مبلغی جابجا نخواهد شد.</span>
        </div>
      </div>
    </div>
  );
}
