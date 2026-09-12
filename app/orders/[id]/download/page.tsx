import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  Download,
  Image as ImageIcon,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  FileArchive,
  Clock,
  AlertTriangle,
  CreditCard
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function OrderDownloadPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect(encodeURI(`/login?redirect=/orders/${params.id}/download`));
  }

  let project: any = null;
  let files: any[] = [];
  let errorMsg = "";

  // 1. Check for Mock URLs first
  const isMockDeposit = params.id === "mock-deposit";
  const isMockFull = params.id === "mock-full";

  if (isMockDeposit || isMockFull) {
    project = {
      id: params.id,
      createdAt: new Date(),
      serviceType: isMockDeposit ? "عکاسی پرتره امیر" : "عکاسی فضای باز امیر",
      paymentStatus: isMockDeposit ? "DEPOSIT_50" : "FULL",
      googleDriveFolderId: "mock-folder-id",
      budget: isMockDeposit ? "۳,۵۰۰,۰۰۰" : "۵,۲۰۰,۰۰۰",
      expert: {
        name: isMockDeposit ? "محسن عصار" : "امیر آرتی",
        imageUrl: isMockDeposit 
          ? "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80"
          : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80"
      }
    };

    files = [
      {
        id: "mock-file-1",
        name: "portrait_shot_01.jpg",
        size: 1520000,
        mimeType: "image/jpeg",
        thumbnailLink: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&h=400&q=80",
        downloadLink: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&h=400&q=80",
      },
      {
        id: "mock-file-2",
        name: "portrait_shot_02.jpg",
        size: 2100000,
        mimeType: "image/jpeg",
        thumbnailLink: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&h=400&q=80",
        downloadLink: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&h=400&q=80",
      },
      {
        id: "mock-file-3",
        name: "portrait_shot_03.jpg",
        size: 1850000,
        mimeType: "image/jpeg",
        thumbnailLink: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&h=400&q=80",
        downloadLink: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&h=400&q=80",
      }
    ];
  } else {
    // Database Flow
    project = await prisma.project.findUnique({
      where: { id: params.id },
    });

    if (!project) {
      redirect("/profile");
    }

    // Authorize Check
    const isOwner = project.contactPhone === session.phone || project.userId === session.userId;
    const isAdmin = session.role === "admin";
    if (!isOwner && !isAdmin) {
      return (
        <div className="min-h-[85dvh] flex flex-col items-center justify-center p-6 bg-slate-950 text-white text-right font-sans" dir="rtl">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
            <div className="text-amber-500 text-sm font-black">خطای عدم دسترسی</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              شما اجازه دسترسی به این سفارش را ندارید. در صورت بروز خطا با پشتیبانی تماس بگیرید.
            </p>
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 px-6 py-3 bg-amber-500 text-slate-950 font-black rounded-full text-xs hover:bg-amber-400 transition"
            >
              بازگشت به پروفایل
            </Link>
          </div>
        </div>
      );
    }

    if (!project.googleDriveFolderId) {
      return (
        <div className="min-h-[85dvh] flex flex-col items-center justify-center p-6 bg-slate-950 text-white text-right font-sans" dir="rtl">
          <div className="max-w-md w-full bg-slate-900 border border-amber-500/20 rounded-[32px] p-8 text-center space-y-5 shadow-2xl relative overflow-hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mx-auto">
              <Clock className="h-6 w-6 animate-pulse" />
            </div>
            <h1 className="text-base font-black text-slate-100">فایل‌ها هنوز آماده نیستند</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              متخصص مربوطه در حال ادیت و نهایی‌سازی تصاویر شماست. به محض بارگذاری فایل‌ها در پوشه، این صفحه برای شما فعال خواهد شد.
            </p>
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-slate-800 text-white font-black rounded-full text-xs hover:bg-slate-700 transition"
            >
              <ArrowRight className="h-4 w-4" />
              بازگشت به سفارش‌ها
            </Link>
          </div>
        </div>
      );
    }

    files = [];
  }

  const isDepositMode = project.paymentStatus === "DEPOSIT_50";

  const formattedDate = new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium"
  }).format(new Date(project.createdAt));

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-36" dir="rtl">
      {/* Top Banner Accent */}
      <div className="h-1.5 w-full bg-gradient-to-l from-amber-600 via-amber-400 to-yellow-500" />

      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 pt-10 space-y-8">
        
        {/* Deposit Warning Banner */}
        {isDepositMode && (
          <div className="rounded-3xl bg-slate-900 border border-amber-500/20 p-5 flex items-start gap-4 shadow-xl">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-450 border border-amber-500/20">
              <AlertTriangle className="h-5.5 w-5.5" />
            </div>
            <div className="text-right space-y-1">
              <h4 className="text-xs font-black text-amber-400">آلبوم ثبت شده با ۵۰٪ بیعانه</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                تصاویر نمایش داده شده در این صفحه، به صورت پیش‌نمایش کم‌کیفیت و دارای واترمارک می‌باشند. جهت دریافت کیفیت اصلی و برداشتن واترمارک، نسبت به تسویه حساب مابقی وجه اقدام نمایید.
              </p>
            </div>
          </div>
        )}

        {/* Header Info Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-[32px] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl backdrop-blur-sm relative overflow-hidden">
          <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-amber-500/5 blur-2xl" />
          
          <div className="flex items-center gap-4 text-right w-full md:w-auto">
            {project.expert?.imageUrl ? (
              <div className="relative h-16 w-16 shrink-0 rounded-full overflow-hidden border border-amber-500/20">
                <Image
                  src={project.expert.imageUrl}
                  alt={project.expert.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="h-16 w-16 shrink-0 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-black">
                J
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-amber-400">
                  {isDepositMode ? "پیش‌نمایش آلبوم بیعانه‌ای" : "تحویل پروژه موفق"}
                </span>
                <Sparkles className="h-3 w-3 text-amber-400 fill-amber-400" />
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-100">
                دانلود فایل‌های پروژه {project.serviceType}
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">
                توسط متخصص {project.expert?.name || "تیم پشتیبانی جار"} • {formattedDate}
              </p>
            </div>
          </div>

          <Link
            href="/profile"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-850 border border-slate-800 text-slate-400 hover:bg-slate-800 transition"
            title="بازگشت به پروفایل"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        {errorMsg && (
          <div className="rounded-2xl bg-rose-950/40 border border-rose-900/50 p-4 text-xs font-bold text-rose-400">
            {errorMsg}
          </div>
        )}

        {/* Photos Grid Header */}
        <div className="border-r-4 border-amber-500 pr-3.5 space-y-1">
          <h2 className="text-sm font-black text-slate-100 flex items-center gap-2">
            <ImageIcon className="h-4.5 w-4.5 text-amber-500" />
            فایل‌های بارگذاری شده ({files.length} فایل)
          </h2>
          <p className="text-[10px] text-slate-500 font-semibold">
            {isDepositMode 
              ? "می‌توانید پیش‌نمایش هر تصویر را به صورت جداگانه ذخیره کنید" 
              : "می‌توانید هر فایل را به صورت جداگانه یا یکجا دانلود کنید"}
          </p>
        </div>

        {/* Deliverables Grid */}
        {files.length === 0 && !errorMsg ? (
          <div className="rounded-2xl border border-slate-850 bg-slate-900/40 p-12 text-center text-xs font-semibold text-slate-500">
            هیچ فایلی یافت نشد.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {files.map((file) => (
              <div
                key={file.id}
                className="bg-slate-900 border border-slate-850 rounded-3xl p-4 flex flex-col justify-between gap-4 transition shadow-lg group hover:border-slate-800"
              >
                {/* Visual Preview Container */}
                <div className="relative aspect-[3/2] w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-850 select-none">
                  {file.thumbnailLink ? (
                    <Image
                      src={file.thumbnailLink.replace(/=s\d+/, "=s600")}
                      alt={file.name}
                      fill
                      sizes="(max-width: 640px) 100vw, 400px"
                      className="object-cover transition duration-300 group-hover:scale-102"
                      unoptimized
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <ImageIcon className="h-10 w-10 text-slate-650" />
                      <span className="text-[9px] font-bold font-mono">{file.mimeType || "File"}</span>
                    </div>
                  )}

                  {/* Watermark overlay in deposit mode */}
                  {isDepositMode && (
                    <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[0.5px] pointer-events-none flex items-center justify-center overflow-hidden">
                      <div className="rotate-[-25deg] text-[13px] font-black text-white/35 border-2 border-white/20 px-4 py-1.5 rounded-xl uppercase tracking-widest select-none">
                        جار - پیش‌نمایش
                      </div>
                    </div>
                  )}
                </div>

                {/* Info & Download Button */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 px-1">
                    <span className="truncate max-w-[200px]">{file.name}</span>
                    <span className="font-mono">
                      {file.size ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "—"}
                    </span>
                  </div>

                  <a
                    href={isDepositMode ? file.thumbnailLink : file.downloadLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex h-11 items-center justify-center gap-1.5 rounded-full bg-slate-800 text-white text-xs font-black hover:bg-slate-750 transition"
                  >
                    <Download className="h-4 w-4 text-slate-400" />
                    {isDepositMode ? "دانلود پیش‌نمایش واترمارک‌دار" : "دانلود نسخه باکیفیت اصلی"}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Sticky Bottom Bar */}
      {files.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 border-t border-slate-800 px-6 py-4 flex items-center justify-center shadow-2xl backdrop-blur-md pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          {isDepositMode ? (
            <div className="w-full max-w-lg flex flex-col sm:flex-row gap-3">
              <a
                href={`/api/orders/${project.id}/download-zip`}
                className="flex-1 flex h-12 items-center justify-center gap-2 rounded-full border border-slate-750 bg-slate-800 hover:bg-slate-750 text-white text-xs font-black transition"
              >
                <FileArchive className="h-4.5 w-4.5 text-slate-400" />
                دانلود یکجای پیش‌نمایش (ZIP)
              </a>
              <Link
                href={`/profile/upgrade`} 
                className="flex-1 flex h-12 items-center justify-center gap-2 rounded-full bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400 transition shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-98"
              >
                <CreditCard className="h-4.5 w-4.5" />
                تسویه حساب و دریافت کیفیت اصلی
              </Link>
            </div>
          ) : (
            <a
              href={`/api/orders/${project.id}/download-zip`}
              className="w-full max-w-md flex h-12 items-center justify-center gap-2 rounded-full bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400 transition shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-98"
            >
              <FileArchive className="h-4.5 w-4.5 text-slate-950" />
              دانلود یکجای تمام فایل‌ها با کیفیت اصلی (فایل ZIP)
            </a>
          )}
        </div>
      )}
    </div>
  );
}
