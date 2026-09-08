"use client";

import { useState, useEffect } from "react";
import { getGalleryProjectBySlug } from "@/app/actions/galleryActions";
import {
  ShoppingBag,
  Check,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  Phone,
  Eye,
  Heart,
  ImageIcon,
  X,
  Sparkles,
  ChevronLeft
} from "lucide-react";

type Props = {
  params: { slug: string };
  searchParams: { payment?: string; authority?: string };
};

type PhotoItem = {
  id: string;
  fileName: string;
  fileSize: number;
  originalUrl: string | null;
  watermarkedUrl: string | null;
  isPurchased: boolean;
};

type ProjectData = {
  id: string;
  title: string;
  slug: string;
  price: number;
  discountThreshold: number | null;
  discountedPrice: number | null;
  description: string | null;
  photos: PhotoItem[];
  hasPurchaseAccess: boolean;
};

export default function ClientGalleryPage({ params, searchParams }: Props) {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Customer Phone Modal States
  const [phone, setPhone] = useState("");
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInputError, setPhoneInputError] = useState("");

  // Shopping Cart States
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [checkoutError, setCheckoutError] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Load project details
  const loadProject = async () => {
    try {
      setIsLoading(true);
      setErrorMsg("");
      const res = await getGalleryProjectBySlug(params.slug, searchParams.authority);
      if (res.success && res.data) {
        setProject(res.data);
        
        // If they already have purchases, filter out already purchased files from active selection
        const purchasedIds = res.data.photos.filter((p: any) => p.isPurchased).map((p: any) => p.id);
        setSelectedPhotoIds(prev => prev.filter(id => !purchasedIds.includes(id)));
      } else {
        setErrorMsg(res.error || "خطا در دریافت اطلاعات گالری.");
      }
    } catch (err) {
      console.error("Failed to load project:", err);
      setErrorMsg("خطایی در دریافت اطلاعات رخ داد.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
    
    // Fetch saved phone number from localStorage if present
    if (typeof window !== "undefined") {
      const savedPhone = localStorage.getItem("customer_phone");
      if (savedPhone) {
        setPhone(savedPhone);
      }
    }
  }, [params.slug, searchParams.authority]);

  const toggleSelectPhoto = (photo: PhotoItem) => {
    if (photo.isPurchased) return; // Already purchased, cannot select
    
    setSelectedPhotoIds(prev => {
      if (prev.includes(photo.id)) {
        return prev.filter(id => id !== photo.id);
      } else {
        return [...prev, photo.id];
      }
    });
  };

  // Triggers Phone Modal first on Checkout click
  const handlePayButtonClick = () => {
    const savedPhone = localStorage.getItem("customer_phone");
    if (!savedPhone) {
      setShowPhoneModal(true);
    } else {
      handleCheckout(savedPhone);
    }
  };

  // Checkout redirect handler
  const handleCheckout = async (targetPhone: string) => {
    setCheckoutError("");
    setIsCheckingOut(true);

    try {
      const res = await fetch("/api/gallery/payment/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project?.id,
          phone: targetPhone,
          photoIds: selectedPhotoIds
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "خطا در برقراری ارتباط با درگاه پرداخت.");
      }

      // Redirect customer to mock gateway or Zarinpal portal
      window.location.href = data.url;
    } catch (err: any) {
      setCheckoutError(err.message || "خطایی در فرآیند پرداخت رخ داد.");
      setIsCheckingOut(false);
    }
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneInputError("");

    const normPhone = phone.trim();
    if (!normPhone || normPhone.length < 10) {
      setPhoneInputError("لطفاً یک شماره همراه معتبر وارد کنید.");
      return;
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("customer_phone", normPhone);
    }
    setShowPhoneModal(false);
    handleCheckout(normPhone);
  };

  // Pricing calculations with Volume Discounts
  const basePrice = project?.price || 0;
  const count = selectedPhotoIds.length;
  
  let isDiscountApplied = false;
  let pricePerShot = basePrice;

  if (
    project?.discountThreshold &&
    project?.discountedPrice &&
    count >= project.discountThreshold
  ) {
    isDiscountApplied = true;
    pricePerShot = project.discountedPrice;
  }

  const totalPrice = count * pricePerShot;

  const isPaymentSuccess = searchParams.payment === "success";
  const isPaymentFailed = searchParams.payment === "failed";

  return (
    <div className="min-h-screen bg-slate-50 pb-36 text-right font-sans" dir="rtl">
      {/* Navbar / Top info */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#006097]/10 text-[#006097]">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-900">{project?.title || "گالری تصاویر مشتری"}</h1>
            <p className="text-[10px] text-slate-400 font-bold">پلتفرم عکاسی جار (Jar)</p>
          </div>
        </div>

        {phone && (
          <button
            onClick={() => setShowPhoneModal(true)}
            className="flex items-center gap-1 text-[10px] font-black text-[#006097] bg-[#006097]/5 px-3 py-1.5 rounded-xl hover:bg-[#006097]/10 transition"
          >
            <Phone className="h-3.5 w-3.5" />
            همراه شما: {phone}
          </button>
        )}
      </nav>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 mt-8">
        
        {/* Payment Banner Alerts */}
        {isPaymentSuccess && (
          <div className="mb-8 rounded-3xl bg-emerald-50 border border-emerald-100 p-5 text-right flex items-start gap-3.5 shadow-sm animate-fade-up">
            <CheckCircle className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-emerald-900">پرداخت با موفقیت انجام شد!</h4>
              <p className="mt-1 text-[10px] font-bold text-emerald-600 leading-relaxed">
                قفل شات‌های خریداری شده باز شد. اکنون می‌توانید نسخه اصلی و بدون واترمارک آن‌ها را با کیفیت اصلی دانلود کنید.
              </p>
            </div>
          </div>
        )}

        {isPaymentFailed && (
          <div className="mb-8 rounded-3xl bg-rose-50 border border-rose-100 p-5 text-right flex items-start gap-3.5 shadow-sm animate-fade-up">
            <AlertCircle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-rose-900">تراکنش ناموفق بود</h4>
              <p className="mt-1 text-[10px] font-bold text-rose-600 leading-relaxed">
                پرداخت شما انجام نشد یا انصراف دادید. در صورت کسر مبلغ، ظرف ۷۲ ساعت به حساب شما بازگردانده می‌شود.
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 bg-white border border-slate-100 rounded-3xl shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-[#006097]" />
            <span className="text-xs font-bold text-slate-400">در حال دریافت گالری تصاویر...</span>
          </div>
        ) : errorMsg ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl text-center p-6 shadow-sm">
            <AlertCircle className="h-10 w-10 text-rose-500 mb-4" />
            <h4 className="text-sm font-black text-slate-700">{errorMsg}</h4>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm leading-relaxed">
              لینک گالری نامعتبر است یا پروژه عکاسی توسط عکاس حذف شده است.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Gallery Info Panel */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-slate-900">{project?.title}</h2>
                {project?.description && (
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{project.description}</p>
                )}
                
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl">
                    قیمت پایه: <span className="text-[#006097]">{basePrice.toLocaleString("fa-IR")} تومان</span>
                  </span>
                  
                  {project?.discountThreshold && project?.discountedPrice && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1 rounded-xl">
                      تخفیف خرید گروهی: خرید بالای {project.discountThreshold} عکس، هر عکس فقط {project.discountedPrice.toLocaleString("fa-IR")} تومان!
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 bg-[#006097]/5 border border-[#006097]/10 p-3 rounded-2xl shrink-0">
                <Eye className="h-4.5 w-4.5 text-[#006097]" />
                <span className="text-[10px] font-black text-[#006097]">برای انتخاب شات‌ها، روی تصاویر کلیک کنید.</span>
              </div>
            </div>

            {checkoutError && (
              <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-xs font-bold text-rose-600 flex items-center gap-2">
                <AlertCircle className="h-4.5 w-4.5" />
                {checkoutError}
              </div>
            )}

            {/* Pinterest/Instagram Grid Layout */}
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
              {project?.photos.map((photo) => {
                const isSelected = selectedPhotoIds.includes(photo.id);
                
                return (
                  <div
                    key={photo.id}
                    onClick={() => toggleSelectPhoto(photo)}
                    onContextMenu={(e) => e.preventDefault()}
                    className={`break-inside-avoid relative rounded-[28px] overflow-hidden border bg-slate-900 group shadow-sm transition duration-350 cursor-pointer ${
                      photo.isPurchased
                        ? "border-emerald-500 ring-2 ring-emerald-500/20"
                        : isSelected
                        ? "border-amber-400 ring-4 ring-amber-400/20 scale-[0.99] shadow-amber-400/5"
                        : "border-slate-100 hover:border-slate-300"
                    }`}
                  >
                    {/* Secure Preview Image */}
                    <img
                      src={photo.watermarkedUrl || "/placeholder.jpg"}
                      alt={photo.fileName}
                      className="w-full h-auto object-cover select-none pointer-events-none transition duration-500 group-hover:scale-105"
                      style={{
                        userSelect: "none",
                        ["WebkitUserDrag" as any]: "none"
                      }}
                    />

                    {/* Watermark Diagonal Repeating Overlay */}
                    {!photo.isPurchased && (
                      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex flex-wrap items-center justify-center p-4">
                        <div className="grid grid-cols-3 gap-8 rotate-[-35deg] opacity-20">
                          {Array.from({ length: 9 }).map((_, i) => (
                            <span
                              key={i}
                              className="text-white text-[18px] font-black tracking-widest select-none uppercase"
                            >
                              PREVIEW
                            </span>
                          ))}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white/20 text-[56px] font-extrabold rotate-[-30deg] tracking-widest select-none uppercase">
                            JAR
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Checkbox / Download overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col justify-between p-4">
                      
                      {/* Selection State row */}
                      <div className="flex justify-end">
                        {photo.isPurchased ? (
                          <span className="bg-emerald-500 text-white text-[9px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                            <Check className="h-3 w-3" />
                            خریداری شده
                          </span>
                        ) : (
                          <div
                            className={`h-7 w-7 rounded-lg flex items-center justify-center transition border shadow-sm ${
                              isSelected
                                ? "bg-amber-400 border-amber-400 text-slate-900"
                                : "bg-white/80 backdrop-blur border-slate-200 text-slate-655 hover:bg-white"
                            }`}
                          >
                            <Heart className={`h-4.5 w-4.5 ${isSelected ? "fill-slate-900" : ""}`} />
                          </div>
                        )}
                      </div>

                      {/* Download Section (Visible only if paid) */}
                      {photo.isPurchased && photo.originalUrl && (
                        <div className="mt-auto">
                          <a
                            href={photo.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="w-full flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 text-white text-xs font-black transition duration-200 hover:bg-emerald-600 shadow-md shadow-emerald-500/10"
                          >
                            <Download className="h-4 w-4" />
                            دانلود نسخه اصلی
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Mobile visual indicators */}
                    {!photo.isPurchased && isSelected && (
                      <div className="absolute top-4 right-4 h-7 w-7 rounded-lg bg-amber-400 border border-amber-400 text-slate-900 flex items-center justify-center md:hidden shadow-md">
                        <Check className="h-4.5 w-4.5 font-bold" strokeWidth={3} />
                      </div>
                    )}
                    {photo.isPurchased && (
                      <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg flex items-center gap-0.5 md:hidden shadow-md">
                        <Check className="h-2.5 w-2.5" />
                        خریداری شده
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Sticky Bottom Shopping Cart Bar */}
      {project && project.photos.length > 0 && selectedPhotoIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/50 px-6 py-4 flex items-center justify-between shadow-[0_-8px_30px_rgba(0,0,0,0.05)] pb-[calc(1.2rem+env(safe-area-inset-bottom,0px))]">
          <div className="flex flex-col text-right">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-[#006097]">
                تعداد شات‌های انتخابی: {count} عدد
              </span>
              {isDiscountApplied && (
                <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                  <Sparkles className="h-2.5 w-2.5 fill-amber-850" />
                  تخفیف ویژه اعمال شد!
                </span>
              )}
            </div>
            <span className="text-base font-black text-slate-800 mt-0.5">
              مجموع فاکتور: {totalPrice.toLocaleString("fa-IR")} تومان
            </span>
          </div>

          <button
            onClick={handlePayButtonClick}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#006097] text-white px-6 py-3.5 text-xs font-black hover:bg-[#004b75] transition-all shadow-lg shadow-[#006097]/25 active:scale-95"
          >
            <ShoppingBag className="h-4.5 w-4.5" />
            پرداخت و دریافت عکس‌های اصلی
          </button>
        </div>
      )}

      {/* MODAL: Customer Phone Verification (Shown on Pay button click) */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-[32px] w-full max-w-sm p-6 text-center relative flex flex-col items-center">
            
            <button
              onClick={() => setShowPhoneModal(false)}
              className="absolute top-6 left-6 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#006097]/10 text-[#006097] mb-4 border border-[#006097]/10">
              <Phone className="h-5.5 w-5.5" />
            </div>

            <h3 className="text-sm font-black text-slate-900">نهایی‌سازی سفارش خرید عکس</h3>
            <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-relaxed">
              لطفاً شماره همراه خود را وارد کنید تا پس از پرداخت، عکس‌های اصلی به این شماره متصل و قابل دانلود شوند.
            </p>

            {phoneInputError && (
              <div className="w-full mt-4 rounded-xl bg-rose-50 p-3 text-[10px] font-bold text-rose-600 border border-rose-100">
                {phoneInputError}
              </div>
            )}

            <form onSubmit={handlePhoneSubmit} className="w-full mt-5 space-y-4">
              <input
                type="text"
                required
                placeholder="مثال: 09123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-[#006097] focus:bg-white text-center font-mono"
                dir="ltr"
              />
              
              <button
                type="submit"
                disabled={isCheckingOut}
                className="w-full flex items-center justify-center gap-1.5 py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-slate-800 transition disabled:opacity-75"
              >
                {isCheckingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    ورود و انتقال به درگاه پرداخت
                    <ChevronLeft className="h-4.5 w-4.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
