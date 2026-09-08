"use client";

import { useState, useEffect, useTransition } from "react";
import { getGalleryProjects, createGalleryProject, checkStorageQuota, deleteGalleryProject } from "@/app/actions/galleryActions";
import { getUnseenSales } from "@/app/actions/financeActions";
import ConfettiCelebration from "@/components/gallery/ConfettiCelebration";
import {
  Sparkles,
  ArrowRight,
  Plus,
  Image as ImageIcon,
  Calendar,
  DollarSign,
  QrCode,
  Copy,
  Check,
  X,
  UploadCloud,
  FileText,
  AlertTriangle,
  Loader2,
  CheckCircle,
  ExternalLink,
  Trash2
} from "lucide-react";
import Link from "next/link";
import QRCode from "react-qr-code";

type DbProject = {
  id: string;
  title: string;
  slug: string;
  accessCode?: string | null;
  price: number;
  createdAt: Date;
  _count?: {
    photos: number;
  };
};

export default function GalleryDashboard() {
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Create Project Modal States
  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [discountThreshold, setDiscountThreshold] = useState("");
  const [discountedPrice, setDiscountedPrice] = useState("");
  
  // Upload Progress States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadIndex, setUploadIndex] = useState(0);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [uploadError, setUploadError] = useState("");

  // QR Code / Success Modal States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdProject, setCreatedProject] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);

  // QR Viewer Modal (for existing projects)
  const [viewerProject, setViewerProject] = useState<DbProject | null>(null);
  const [unseenSales, setUnseenSales] = useState(0);

  // Load initial projects list
  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const res = await getGalleryProjects();
      if (res.success && res.data) {
        setProjects(res.data);
      }
    } catch (err) {
      console.error("Error loading projects:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (confirm("آیا از حذف این پروژه و تمام تصاویر مرتبط با آن از سرور و گوگل درایو مطمئن هستید؟ این کار حجم فضای مصرفی شما را آزاد می‌کند.")) {
      try {
        setIsLoading(true);
        const res = await deleteGalleryProject(id);
        if (res.success) {
          loadProjects();
        } else {
          alert(res.error || "خطا در حذف پروژه.");
        }
      } catch (err) {
        console.error("Failed to delete project:", err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadProjects();
    
    // Fetch unseen sales to trigger confetti celebration
    getUnseenSales().then(count => {
      if (count > 0) {
        setUnseenSales(count);
      }
    }).catch(err => {
      console.error("Failed to fetch unseen sales count:", err);
    });
  }, []);

  // Calculate total size of selected files in bytes
  const totalFilesSizeBytes = files.reduce((acc, f) => acc + f.size, 0);
  const totalFileSizeMB = (totalFilesSizeBytes / (1024 * 1024)).toFixed(2);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(file => 
        file.type.startsWith("image/")
      );
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(file =>
        file.type.startsWith("image/")
      );
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Main Submit handler (Quota validation + Upload + Creation)
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError("");

    if (!title.trim() || !price || files.length === 0) {
      setUploadError("لطفاً تمامی فیلدها را پر کرده و حداقل یک تصویر انتخاب کنید.");
      return;
    }

    const priceNum = parseInt(price, 10);
    if (isNaN(priceNum) || priceNum < 0) {
      setUploadError("قیمت وارد شده نامعتبر است.");
      return;
    }

    setIsUploading(true);
    setUploadIndex(0);
    setUploadProgressText("در حال بررسی ظرفیت فضای ابری شما...");

    try {
      // 1. Double check storage quota server-side
      const quotaRes = await checkStorageQuota(totalFilesSizeBytes);
      if (!quotaRes.success) {
        throw new Error(quotaRes.error || "ظرفیت فضای ابری شما کافی نیست.");
      }

      // 2. Upload files sequentially
      const uploadedPhotosData: { fileName: string; fileSize: number; originalUrl: string; watermarkedUrl?: string }[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadIndex(i + 1);
        setUploadProgressText(`در حال آپلود عکس ${i + 1} از ${files.length} (${file.name})...`);

        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch("/api/gallery/upload", {
          method: "POST",
          body: formData
        });

        const data = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(data.error || `خطا در آپلود عکس ${file.name}`);
        }

        uploadedPhotosData.push({
          fileName: data.fileName,
          fileSize: data.fileSize,
          originalUrl: data.originalUrl,
          watermarkedUrl: data.watermarkedUrl
        });
      }

      // 3. Create project in database
      setUploadProgressText("در حال ثبت نهایی پروژه در سیستم...");
      const thresholdNum = discountThreshold ? parseInt(discountThreshold, 10) : null;
      const discPriceNum = discountedPrice ? parseInt(discountedPrice, 10) : null;

      const createRes = await createGalleryProject(
        title.trim(),
        priceNum,
        uploadedPhotosData,
        thresholdNum,
        discPriceNum
      );
      
      if (!createRes.success) {
        throw new Error(createRes.error || "خطا در ساخت پروژه گالری.");
      }

      // Success
      setCreatedProject(createRes.data);
      setShowSuccessModal(true);
      setIsOpenCreate(false);
      
      // Reset form states
      setTitle("");
      setPrice("");
      setFiles([]);
      setDiscountThreshold("");
      setDiscountedPrice("");
      loadProjects();
    } catch (err: any) {
      setUploadError(err.message || "خطایی در فرآیند آپلود رخ داد.");
    } finally {
      setIsUploading(false);
    }
  };

  const getDomainLink = (slug: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/gallery/${slug}`;
    }
    return `https://jar.ir/gallery/${slug}`;
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="mx-auto w-full max-w-4xl animate-fade-up text-right pb-24 px-4 sm:px-6" dir="rtl">
      <ConfettiCelebration unseenSales={unseenSales} />
      {/* Header */}
      <header className="mb-10 flex items-center justify-between mt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#006097]/10 text-[#006097]">
            <Sparkles className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">گالری شات‌های مشتری</h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              آلبوم تصاویر خود را آپلود کنید، قیمت تعیین کنید و لینک پرداخت امن را در قالب بارکد به مشتری بدهید.
            </p>
          </div>
        </div>
        <Link
          href="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowRight className="h-5 w-5 text-slate-500" />
        </Link>
      </header>

      {/* Action Banner */}
      <div className="mb-8 flex justify-between items-center bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="text-right">
          <h4 className="text-sm font-black text-slate-800">کسب درآمد هوشمند از فروش شات‌ها</h4>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            مشتریان شما می‌توانند شات‌های انتخابی را تماشا کرده و با پرداخت آنلاین، نسخه اصلی را دانلود کنند.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/dashboard/wallet"
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white text-slate-700 px-4 py-3 text-xs font-black hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            کیف پول و تسویه
          </Link>
          <button
            onClick={() => setIsOpenCreate(true)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#006097] text-white px-5 py-3 text-xs font-black hover:bg-[#004b75] transition-all shadow-md shadow-[#006097]/15 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            پروژه شاتی جدید
          </button>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-5">
        <h3 className="text-sm font-black text-slate-800 px-1">پروژه‌های گالری فعال شما</h3>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#006097]" />
            <span className="text-xs font-bold text-slate-400">در حال دریافت گالری‌ها...</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-150 rounded-3xl text-center p-6 border-dashed">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 mb-4 border border-slate-100">
              <ImageIcon className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-black text-slate-700">هیچ پروژه‌ای یافت نشد</h4>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm leading-relaxed">
              اولین آلبوم عکاسی خود را ایجاد کنید و با آپلود تصاویر آن را در قالب گالری شات به مشتریان بفروشید.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex flex-col p-5 bg-white border border-slate-100 rounded-3xl transition hover:border-[#006097] hover:shadow-md shadow-sm relative group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-slate-600">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition duration-200"
                      title="حذف پروژه"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(project.createdAt).toLocaleDateString("fa-IR")}
                  </span>
                </div>

                <div className="mt-4 text-right">
                  <h4 className="text-sm font-black text-slate-900 line-clamp-1">{project.title}</h4>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-bold border-t border-slate-50 pt-3">
                    <span className="flex items-center gap-1 font-mono">
                      {project._count?.photos || 0} شات
                    </span>
                    <span className="text-[#006097] flex items-center gap-0.5">
                      {project.price.toLocaleString("fa-IR")} تومان / عکس
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setViewerProject(project)}
                  className="mt-5 w-full flex items-center justify-center gap-1.5 rounded-2xl border border-[#006097]/15 bg-[#006097]/5 py-3 text-xs font-black text-[#006097] transition hover:bg-[#006097] hover:text-white"
                >
                  <QrCode className="h-4 w-4" />
                  مشاهده لینک و بارکد
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: Create Project / Upload Form */}
      {isOpenCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-[32px] w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 md:p-8 relative text-right flex flex-col">
            
            {/* Close Button */}
            <button
              onClick={() => {
                if (!isUploading) setIsOpenCreate(false);
              }}
              disabled={isUploading}
              className="absolute top-6 left-6 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 mb-2">
              <Plus className="h-5 w-5 text-[#006097]" />
              ساخت پروژه گالری شاتی جدید
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-6 border-b border-slate-100 pb-4">
              عنوان پروژه را وارد کنید، قیمت هر شات دانلودی را مشخص کرده و عکس‌ها را آپلود کنید.
            </p>

            {uploadError && (
              <div className="mb-6 rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-600 flex items-center gap-2 border border-rose-100">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                {uploadError}
              </div>
            )}

            {isUploading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-[#006097]" />
                <div className="text-center space-y-1.5">
                  <h4 className="text-sm font-black text-slate-800">{uploadProgressText}</h4>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    لطفاً پنجره مرورگر را نبندید تا فرآیند آپلود با موفقیت تمام شود.
                  </p>
                </div>
                {files.length > 1 && (
                  <div className="w-full bg-slate-100 rounded-full h-2 max-w-xs overflow-hidden mt-2">
                    <div
                      className="bg-[#006097] h-full transition-all duration-300 rounded-full"
                      style={{ width: `${(uploadIndex / files.length) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleCreateProject} className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-xs font-bold text-slate-500">عنوان پروژه عکاسی <span className="text-rose-500">*</span></span>
                    <input
                      type="text"
                      required
                      placeholder="مثال: پرتره استودیویی یلدا"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-900 outline-none transition focus:border-[#006097] focus:bg-white"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-bold text-slate-500">قیمت هر شات دانلودی (تومان) <span className="text-rose-500">*</span></span>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="مثال: ۵۰۰۰۰"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-900 outline-none transition focus:border-[#006097] focus:bg-white text-left font-mono"
                        dir="ltr"
                      />
                      <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </label>
                </div>

                {/* Tiered Volume Discount Section */}
                <div className="grid gap-5 md:grid-cols-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <label className="block space-y-2">
                    <span className="text-xs font-bold text-slate-500">تعداد عکس برای اعمال تخفیف (اختیاری)</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="مثال: ۵"
                      value={discountThreshold}
                      onChange={(e) => setDiscountThreshold(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-900 outline-none transition focus:border-[#006097] text-left font-mono"
                      dir="ltr"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-bold text-slate-500">قیمت بعد از تخفیف (تومان)</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="مثال: ۴۰۰۰۰"
                      value={discountedPrice}
                      onChange={(e) => setDiscountedPrice(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-900 outline-none transition focus:border-[#006097] text-left font-mono"
                      dir="ltr"
                    />
                  </label>
                </div>

                {/* Drag & Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-slate-200 hover:border-[#006097] bg-slate-50 hover:bg-slate-50/30 rounded-[28px] p-6 text-center transition cursor-pointer relative"
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="mx-auto h-10 w-10 text-slate-400 mb-2" />
                  <h4 className="text-xs font-black text-slate-700">تصاویر خود را به اینجا بکشید یا کلیک کنید</h4>
                  <p className="text-[10px] text-slate-400 mt-1">فرمت‌های مجاز: JPEG, PNG, WEBP</p>
                </div>

                {/* Files List & Total Size Check */}
                {files.length > 0 && (
                  <div className="space-y-3 bg-slate-50 rounded-2xl p-4 border border-slate-100 max-h-40 overflow-y-auto">
                    <div className="flex justify-between items-center text-[10px] font-black text-[#006097]">
                      <span>تعداد فایل‌ها: {files.length} عدد</span>
                      <span>حجم کل: {totalFileSizeMB} مگابایت</span>
                    </div>

                    <div className="space-y-1.5">
                      {files.map((file, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[10px] bg-white border border-slate-100 rounded-xl p-2 font-mono">
                          <span className="truncate max-w-[250px] text-slate-800 text-right">{file.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                            <button
                              type="button"
                              onClick={() => removeFile(idx)}
                              className="text-rose-500 hover:text-rose-700 transition"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={files.length === 0}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#006097] py-3.5 text-xs font-black text-white hover:bg-[#004b75] transition shadow-lg shadow-[#006097]/15 disabled:opacity-50"
                >
                  <UploadCloud className="h-4.5 w-4.5" />
                  بررسی ظرفیت و شروع آپلود
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Creation Success with QR Code */}
      {showSuccessModal && createdProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-[32px] w-full max-w-md p-6 text-center relative flex flex-col items-center">
            
            <button
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-6 left-6 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4 border border-emerald-100 animate-bounce">
              <CheckCircle className="h-6 w-6" />
            </div>

            <h3 className="text-base font-black text-slate-900">پروژه با موفقیت ایجاد شد!</h3>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
              بارکد و لینک خرید گالری آماده ارسال به مشتری است.
            </p>

            {/* QR Code Container */}
            <div className="my-6 bg-slate-50 p-4 rounded-3xl border border-slate-100 flex items-center justify-center shadow-inner">
              <QRCode
                value={getDomainLink(createdProject.slug)}
                size={160}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 256 256`}
              />
            </div>

            {/* Link Copy Box */}
            <div className="w-full bg-slate-50 rounded-2xl border border-slate-150 p-3.5 flex items-center justify-between gap-3 text-left font-mono">
              <button
                onClick={() => handleCopyLink(getDomainLink(createdProject.slug))}
                className="flex items-center justify-center h-9 w-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition shrink-0 shadow-sm"
              >
                {isCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
              <span className="truncate text-xs font-bold text-slate-800 direction-ltr w-full text-left">
                {getDomainLink(createdProject.slug)}
              </span>
            </div>

            {/* Access Code PIN Box */}
            {createdProject.accessCode && (
              <div className="w-full mt-4 bg-amber-50/60 border border-amber-100 rounded-2xl p-4 text-center">
                <span className="text-[10px] font-black text-amber-800">کد دسترسی ۵ رقمی (PIN):</span>
                <p className="text-2xl font-black tracking-widest text-[#006097] mt-1 font-mono">{createdProject.accessCode}</p>
                <p className="text-[9px] text-slate-450 font-semibold mt-1.5 leading-relaxed">
                  می‌توانید از مشتری بخواهید با وارد کردن این کد در پروفایل شما، عکس‌هایش را دریافت کند.
                </p>
              </div>
            )}

            <button
              onClick={() => setShowSuccessModal(false)}
              className="mt-6 w-full py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-slate-800 transition"
            >
              بستن و بازگشت به داشبورد
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: View Link & QR Code (Existing Projects) */}
      {viewerProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-[32px] w-full max-w-md p-6 text-center relative flex flex-col items-center">
            
            <button
              onClick={() => setViewerProject(null)}
              className="absolute top-6 left-6 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-black text-slate-900 line-clamp-1 max-w-[280px]">گالری: {viewerProject.title}</h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              بارکد و لینک مستقیم اختصاصی جهت ارسال به مشتری
            </p>

            {/* QR Code Container */}
            <div className="my-6 bg-slate-50 p-4 rounded-3xl border border-slate-100 flex items-center justify-center shadow-inner">
              <QRCode
                value={getDomainLink(viewerProject.slug)}
                size={160}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 256 256`}
              />
            </div>

            {/* Link Copy Box */}
            <div className="w-full bg-slate-50 rounded-2xl border border-slate-150 p-3.5 flex items-center justify-between gap-3 text-left font-mono">
              <button
                onClick={() => handleCopyLink(getDomainLink(viewerProject.slug))}
                className="flex items-center justify-center h-9 w-9 rounded-xl bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 transition shrink-0 shadow-sm"
              >
                {isCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
              <span className="truncate text-xs font-bold text-slate-800 direction-ltr w-full text-left">
                {getDomainLink(viewerProject.slug)}
              </span>
            </div>

            {/* Access Code PIN Box */}
            {viewerProject.accessCode && (
              <div className="w-full mt-4 bg-amber-50/60 border border-amber-100 rounded-2xl p-4 text-center">
                <span className="text-[10px] font-black text-amber-800">کد دسترسی ۵ رقمی (PIN):</span>
                <p className="text-2xl font-black tracking-widest text-[#006097] mt-1 font-mono">{viewerProject.accessCode}</p>
                <p className="text-[9px] text-slate-450 font-semibold mt-1.5 leading-relaxed">
                  می‌توانید از مشتری بخواهید با وارد کردن این کد در پروفایل شما، عکس‌هایش را دریافت کند.
                </p>
              </div>
            )}

            <div className="mt-6 w-full flex gap-3">
              <Link
                href={`/gallery/${viewerProject.slug}`}
                target="_blank"
                className="flex-1 py-3 bg-[#006097] text-white rounded-2xl text-xs font-black hover:bg-[#004b75] transition flex items-center justify-center gap-1"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                مشاهده مستقیم گالری
              </Link>
              <button
                onClick={() => setViewerProject(null)}
                className="py-3 px-6 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black hover:bg-slate-200 transition"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
