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

export default async function PlanMockGatewayPage({ searchParams }: Props) {
  const authority = searchParams.authority;

  if (!authority) {
    notFound();
  }

  if (authority.includes("GALLERY")) {
    notFound();
  }

  const transaction = await prisma.transaction.findUnique({
    where: { authority },
    include: { plan: true },
  });
  if (!transaction) {
    notFound();
  }

  const titleText = "شبیه‌ساز پرداخت زرین‌پال (اشتراک جار)";

  const amount = transaction.amount;
  const nameLabel = "پلن اشتراک:";
  const nameValue = transaction.plan.nameFa;
  const secondaryLabel = "مدت دوره:";
  const secondaryValue =
    transaction.durationMonths === 12 ? "اشتراک ۱ ساله (سالانه)" : "اشتراک ۳ ماهه";

  const successVerifyUrl = `/api/payment/verify?Authority=${transaction.authority}&Status=OK`;
  const cancelVerifyUrl = `/api/payment/verify?Authority=${transaction.authority}&Status=NOK`;

  return (
    <div className="min-h-[85dvh] flex items-center justify-center bg-slate-50 px-4 py-12 text-right font-sans" dir="rtl">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-950 p-6 text-center text-white">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
            <CreditCard className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-base font-bold">{titleText}</h1>
          <p className="mt-1 text-[10px] text-slate-400">محیط محلی تست پرداخت کارت‌های عضو شتاب</p>
        </div>

        {/* Invoice Info */}
        <div className="p-6 border-b border-slate-50 space-y-4 font-bold text-xs text-slate-500">
          <div className="flex items-center justify-between">
            <span>سفارش دهنده:</span>
            <span className="text-slate-900 font-mono">کاربر سیستم</span>
          </div>

          <div className="flex items-center justify-between">
            <span>{nameLabel}</span>
            <span className="text-[#006097]">{nameValue}</span>
          </div>

          <div className="flex items-center justify-between">
            <span>{secondaryLabel}</span>
            <span className="text-slate-900">{secondaryValue}</span>
          </div>

          <div className="flex items-center justify-between">
            <span>مبلغ تراکنش:</span>
            <span className="text-emerald-600 font-black font-mono">{formatPrice(amount)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span>Authority شناسه:</span>
            <span className="font-mono text-slate-900 select-all" dir="ltr">{authority}</span>
          </div>
        </div>

        {/* Simulation Actions */}
        <div className="p-6 space-y-3">
          <a
            href={successVerifyUrl}
            className="w-full flex h-12 items-center justify-center gap-2 rounded-2xl bg-green-600 text-white text-xs font-black transition duration-200 hover:bg-green-700 active:scale-98"
          >
            <Check className="h-4 w-4" />
            شبیه‌سازی پرداخت موفقیت‌آمیز
          </a>

          <a
            href={cancelVerifyUrl}
            className="w-full flex h-12 items-center justify-center gap-2 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-black transition duration-200 hover:bg-rose-100 active:scale-98"
          >
            <X className="h-4 w-4" />
            شبیه‌سازی انصراف (تراکنش ناموفق)
          </a>
        </div>

        <div className="bg-slate-50 px-6 py-4 flex items-center justify-center gap-1.5 text-[9px] font-bold text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          این درگاه صرفاً برای شبیه‌سازی خرید اشتراک یا گالری است.
        </div>
      </div>
    </div>
  );
}
