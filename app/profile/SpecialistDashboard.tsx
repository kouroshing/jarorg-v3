"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import {
  User,
  ShieldCheck,
  Award,
  Zap,
  Cloud,
  MapPin,
  Clock,
  ChevronLeft,
  CheckCircle2,
  UploadCloud,
  Copy,
  FileText,
  Check,
  Lock,
  Sparkles,
  BarChart3,
  Calendar,
  Eye,
  Folder,
  FolderPlus,
  ArrowRight,
  File,
  Download,
  Loader2,
  TrendingUp,
  Users,
  Percent,
  Briefcase,
  Plus,
  Trash2,
  Camera,
  Image as ImageIcon,
  Check as CheckIcon,
  X as XIcon,
  LogOut,
} from "lucide-react";
import { logout } from "@/app/actions/authActions";
import {
  updateUserDisplayName,
  updateUserStorageLimit,
} from "@/app/actions/profileActions";
import type { ProfileUser } from "@/lib/profile/types";

type TabId = "active-projects" | "archive" | "settings" | "verification";

const inputClasses =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-black placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[#FACC15]";

// Custom SVG Blue Badge Component for Jar
export function BlueBadgeIcon({ className = "h-5 w-5", active = true }: { className?: string; active?: boolean }) {
  return (
    <svg 
      className={`${className} shrink-0`} 
      viewBox="0 0 679 679" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Star Verification Ribbon background */}
      <path
        d="M339.5 15 L382 78 L455 58 L475 130 L548 140 L542 215 L600 262 L570 332 L612 398 L552 425 L558 500 L483 508 L458 578 L387 560 L339.5 615 L292 560 L221 578 L196 508 L121 500 L127 425 L67 398 L109 332 L79 262 L137 215 L131 140 L204 130 L224 58 L297 78 Z"
        fill={active ? "#2563eb" : "#cbd5e1"}
      />
      {/* Inner logo path with transparent fill cut out */}
      <path
        d="M1566,1188v.5c0,187.5-152,339.5-339.5,339.5S887,1376,887,1188.5,1039,849,1226.5,849c3.85,0,7.69.06,11.5.2v151q-4.47-.22-9-.22c-104.38,0-189,84.62-189,189s84.62,189,189,189,189-84.62,189-189c0-.33,0-.67,0-1Z"
        transform="translate(-887 -849)"
        fill="#ffffff"
      />
    </svg>
  );
}

export function SpecialistDashboard({
  user,
  projects: initialStaticProjects,
  isSpecialistUser = false,
}: {
  user: ProfileUser;
  projects: any[];
  isSpecialistUser?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("active-projects");
  const [name, setName] = useState(user.displayName || "متخصص جار");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Availability Toggle State
  const [isOnline, setIsOnline] = useState(true);

  // Real Database Storage Metrics State
  const [usedStorage, setUsedStorage] = useState(0);
  const [storageLimit, setStorageLimit] = useState(2147483648); // default to 2GB
  const [isLoadingStorage, setIsLoadingStorage] = useState(true);
  const [userTier, setUserTier] = useState<"BASIC" | "PRO" | "ULTRA">("PRO");

  // Masterclass & Verification Badges State
  const [has100DaysMasterclass, setHas100DaysMasterclass] = useState(false);
  const [examCheckoutModal, setExamCheckoutModal] = useState<{ isOpen: boolean; branchName: string; price: number } | null>(null);
  const [examRegisteredBranches, setExamRegisteredBranches] = useState<string[]>([]);

  // Onboarding States
  const [onboardingStatus, setOnboardingStatus] = useState<"loading" | "not_started" | "pending_approval" | "approved">("loading");
  const [obStep, setObStep] = useState(1);

  // Onboarding Step 1: Base & Location
  const [obCity, setObCity] = useState("تهران");
  const [obHasStudio, setObHasStudio] = useState(false);
  const [obStudioImages, setObStudioImages] = useState<string[]>([
    "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?q=80&w=300&auto=format&fit=crop",
  ]);
  const [obLocationTypes, setObLocationTypes] = useState<string[]>(["outdoor"]);

  // Onboarding Step 2: Roles & Equipment
  const [obRoles, setObRoles] = useState<string[]>(["photographer"]);
  const [equipmentInput, setEquipmentInput] = useState("");
  const [obEquipment, setObEquipment] = useState<string[]>([
    "Sony A7IV Camera Body",
    "Sigma 24-70mm f/2.8 Lens",
    "Godox AD200 Pro Flash Light",
  ]);

  // Onboarding Step 3: Genres & Pricing
  const [selectedGenres, setSelectedGenres] = useState<string[]>(["portrait"]);
  const [genreConfigs, setGenreConfigs] = useState<{
    [key: string]: {
      baseHourPrice: string;
      baseDeliveredShots: string;
      includesEditing: boolean;
      pricingStrategyType: "manual" | "decreasing_percentage";
      portfolioImages: string[];
      hour2Price: string;
      hour3Price: string;
      hour4Price: string;
    };
  }>({
    portrait: {
      baseHourPrice: "1200000",
      baseDeliveredShots: "35",
      includesEditing: true,
      pricingStrategyType: "decreasing_percentage",
      portfolioImages: ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200"],
      hour2Price: "2100000",
      hour3Price: "2880000",
      hour4Price: "3540000",
    },
    birthday: {
      baseHourPrice: "1500000",
      baseDeliveredShots: "40",
      includesEditing: true,
      pricingStrategyType: "decreasing_percentage",
      portfolioImages: ["https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=200"],
      hour2Price: "2625000",
      hour3Price: "3600000",
      hour4Price: "4425000",
    },
    commercial: {
      baseHourPrice: "2000000",
      baseDeliveredShots: "50",
      includesEditing: true,
      pricingStrategyType: "decreasing_percentage",
      portfolioImages: ["https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=200"],
      hour2Price: "3500000",
      hour3Price: "4800000",
      hour4Price: "5900000",
    },
    wedding: {
      baseHourPrice: "3000000",
      baseDeliveredShots: "80",
      includesEditing: true,
      pricingStrategyType: "decreasing_percentage",
      portfolioImages: ["https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=200"],
      hour2Price: "5250000",
      hour3Price: "7200000",
      hour4Price: "8850000",
    },
  });

  const [onboardingError, setOnboardingError] = useState("");
  const [isOnboardingPending, setIsOnboardingPending] = useState(false);

  // Hidden File Inputs Refs for Onboarding
  const studioFilesRef = useRef<HTMLInputElement>(null);
  const genreFilesRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Project-Based File Manager States
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any | null>(null);
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Project creation Form modal
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [creationError, setCreationError] = useState("");

  // Upgrade Modal dialog States
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [lockedFeatureName, setLockedFeatureName] = useState("");

  // Drag and Drop Uploader State
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadErrorMessage, setUploadErrorMessage] = useState("");
  const [uploadedFileLink, setUploadedFileLink] = useState("");
  const [fileName, setFileName] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch storage metrics & onboarding details from DB
  const fetchStorageStatus = async () => {
    try {
      const res = await fetch("/api/specialist/storage-status");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUsedStorage(data.usedStorage);
          setStorageLimit(data.storageLimit);
          setUserTier(data.tier as "BASIC" | "PRO" | "ULTRA");
          setOnboardingStatus(data.onboardingStatus as any);
          setHas100DaysMasterclass(data.has100DaysMasterclass || false);
        }
      }
    } catch (err) {
      console.error("Failed to load storage status from DB", err);
    } finally {
      setIsLoadingStorage(false);
    }
  };

  // Fetch projects list from dynamic File Manager API
  const fetchProjects = async () => {
    setProjectsList([]);
  };

  // Fetch files in a specific project folder
  const fetchProjectFiles = async (projectId: string) => {
    setProjectFiles([]);
  };

  useEffect(() => {
    fetchStorageStatus();
    fetchProjects();
  }, []);

  // Format bytes to Persian digit display
  const toPersianDigits = (num: string | number) => {
    const id = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    return num.toString().replace(/[0-9]/g, (w) => id[+w]);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "۰ بایت";
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb < 0.01) {
      const mb = bytes / (1024 * 1024);
      return `${toPersianDigits(mb.toFixed(1).replace(".", "/"))} مگابایت`;
    }
    return `${toPersianDigits(gb.toFixed(2).replace(".", "/"))} گیگابایت`;
  };

  // Budget Parsing Helper for Business Analytics Summation
  const parseBudget = (budgetStr: string) => {
    if (!budgetStr || budgetStr === "—") return 0;
    const map: { [key: string]: string } = {
      "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
      "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9"
    };
    const cleaned = budgetStr
      .replace(/[۰-۹]/g, (w) => map[w] || w)
      .replace(/,/g, "")
      .replace(/[^0-9.]/g, "");
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
  };

  // Business Analytics calculations
  const totalRevenue = projectsList.reduce((acc, p) => {
    if (p.status === "delivered" || p.googleDriveFolderId) {
      return acc + parseBudget(p.budget);
    }
    return acc;
  }, 0);

  const activeProjectsCount = projectsList.filter(
    (p) => p.status === "in_progress" || !p.googleDriveFolderId
  ).length;

  const uniqueClientsCount = new Set(
    projectsList.map((p) => p.clientName).filter(Boolean)
  ).size;

  const completedCount = projectsList.filter(
    (p) => p.status === "delivered" || p.googleDriveFolderId
  ).length;

  const conversionRate = projectsList.length > 0
    ? Math.round((completedCount / projectsList.length) * 100)
    : 0;

  // Get active tier details based on storageLimit from database
  const getTierDetails = () => {
    if (userTier === "BASIC") {
      return {
        id: "basic" as const,
        name: "جار بیسیک (Basic)",
        badge: "عضو عادی",
        badgeColor: "text-slate-500 bg-slate-50 border-slate-100",
        storageTotal: "۱ گیگابایت",
        storageUsed: formatBytes(usedStorage),
        storagePercent: (usedStorage / (1024 * 1024 * 1024)) * 100,
        location: "تهران (پوشش استاندارد)",
        viewsCount: "۱۲ بازدید",
      };
    } else if (userTier === "ULTRA") {
      const percent = storageLimit > 0 ? (usedStorage / storageLimit) * 100 : 0;
      return {
        id: "ultra" as const,
        name: "جار اولترا (Jar Ultra)",
        badge: "تاییدشده طلایی",
        badgeColor: "text-amber-600 bg-amber-50 border-amber-100",
        storageTotal: storageLimit > 1000 * 1024 * 1024 * 1024 ? "نامحدود VIP" : formatBytes(storageLimit),
        storageUsed: formatBytes(usedStorage),
        storagePercent: percent,
        location: "سراسر کشور (VIP اولویت‌دار)",
        viewsCount: "۵۸۳ بازدید",
      };
    } else {
      // PRO
      const percent = (usedStorage / storageLimit) * 100;
      return {
        id: "pro" as const,
        name: "جار پرو (Jar Pro)",
        badge: "تاییدشده نقره‌ای",
        badgeColor: "text-blue-500 bg-blue-50 border-blue-100",
        storageTotal: formatBytes(storageLimit),
        storageUsed: formatBytes(usedStorage),
        storagePercent: percent,
        location: "تهران (پوشش استاندارد)",
        viewsCount: "۱۴۲ بازدید",
      };
    }
  };

  const specialistTier = getTierDetails();

  const handleSaveName = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateUserDisplayName(name);
      if (result.success) {
        setMessage("success");
      } else {
        setMessage(result.error);
      }
    });
  };

  // Live Tester switcher callback to update database capacity
  const handleUpdatePlan = (tierId: "basic" | "pro" | "ultra") => {
    let limitBytes = 2147483648; // 2GB
    if (tierId === "basic") {
      limitBytes = 0;
    } else if (tierId === "ultra") {
      limitBytes = 100 * 1024 * 1024 * 1024; // 100GB
    }

    startTransition(async () => {
      const res = await updateUserStorageLimit(limitBytes);
      if (res.success) {
        fetchStorageStatus();
      }
    });
  };

  // Create project folder action
  const handleCreateProjectFolder = async () => {
    setCreationError("");
    if (!newProjectName.trim()) {
      setCreationError("وارد کردن نام پروژه الزامی است.");
      return;
    }

    setCreationError("مدیریت پروژه‌ها به استودیوی جدید متخصصین منتقل شده است.");
  };

  // Click on a locked feature handler
  const handleLockedClick = (featureName: string) => {
    setLockedFeatureName(featureName);
    setIsUpgradeModalOpen(true);
  };

  // Uploader event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = (file: File) => {
    if (!activeProject) return;
    setFileName(file.name);
    setUploadStatus("error");
    setUploadErrorMessage("بارگذاری فایل در این بخش متوقف شده است؛ لطفاً از استودیوی جدید متخصصین (/specialist/portfolio) استفاده کنید.");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(uploadedFileLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Onboarding Equipment add/remove
  const handleAddEquipment = () => {
    if (equipmentInput.trim() && !obEquipment.includes(equipmentInput.trim())) {
      setObEquipment((prev) => [...prev, equipmentInput.trim()]);
      setEquipmentInput("");
    }
  };

  const handleRemoveEquipment = (eq: string) => {
    setObEquipment((prev) => prev.filter((item) => item !== eq));
  };

  // Onboarding Multi-file Studio image selection (Object URLs Preview)
  const handleStudioFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      const urls = selected.map((file) => URL.createObjectURL(file));
      setObStudioImages((prev) => [...prev, ...urls]);
    }
  };

  const handleRemoveStudioImage = (index: number) => {
    setObStudioImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Onboarding Multi-file Portfolio image selection (Object URLs Preview)
  const handlePortfolioFilesSelect = (genre: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      const urls = selected.map((file) => URL.createObjectURL(file));
      setGenreConfigs((prev) => {
        const current = prev[genre];
        return {
          ...prev,
          [genre]: {
            ...current,
            portfolioImages: [...current.portfolioImages, ...urls],
          },
        };
      });
    }
  };

  const handleRemovePortfolioImage = (genre: string, index: number) => {
    setGenreConfigs((prev) => {
      const current = prev[genre];
      return {
        ...prev,
        [genre]: {
          ...current,
          portfolioImages: current.portfolioImages.filter((_, i) => i !== index),
        },
      };
    });
  };

  // Location selection toggles
  const handleToggleLocationType = (type: string) => {
    setObLocationTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Role selection toggles
  const handleToggleRole = (role: string) => {
    setObRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  // Genre selection toggles
  const handleToggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  // Pricing configuration inputs updates
  const handleUpdateGenreConfig = (genre: string, key: string, value: any) => {
    setGenreConfigs((prev) => {
      const current = prev[genre];
      const updated = { ...current, [key]: value };

      if (key === "baseHourPrice" || key === "pricingStrategyType") {
        const basePrice = parseBudget(key === "baseHourPrice" ? value : current.baseHourPrice);
        const type = key === "pricingStrategyType" ? value : current.pricingStrategyType;

        if (type === "decreasing_percentage" && basePrice > 0) {
          updated.hour2Price = Math.round(basePrice * 1.75).toString();
          updated.hour3Price = Math.round(basePrice * 2.4).toString();
          updated.hour4Price = Math.round(basePrice * 2.95).toString();
        }
      }

      return { ...prev, [genre]: updated };
    });
  };

  // Onboarding Form Submit
  const handleOnboardingSubmit = async () => {
    setOnboardingError("");
    setIsOnboardingPending(true);

    const formattedGenres = selectedGenres.map((g) => ({
      genreName: g === "portrait" ? "پرتره" : g === "birthday" ? "تولد و کودک" : g === "commercial" ? "تبلیغاتی و محصول" : "عروسی و فرمالیته",
      genreKey: g,
      baseHourPrice: parseBudget(genreConfigs[g].baseHourPrice),
      baseDeliveredShots: parseInt(genreConfigs[g].baseDeliveredShots, 10) || 0,
      includesEditing: genreConfigs[g].includesEditing,
      pricingStrategyType: genreConfigs[g].pricingStrategyType,
      portfolioImages: genreConfigs[g].portfolioImages,
      customRates: genreConfigs[g].pricingStrategyType === "manual" 
        ? { 
            hour2: parseBudget(genreConfigs[g].hour2Price), 
            hour3: parseBudget(genreConfigs[g].hour3Price),
            hour4: parseBudget(genreConfigs[g].hour4Price)
          }
        : { 
            hour2: Math.round(parseBudget(genreConfigs[g].baseHourPrice) * 1.75), 
            hour3: Math.round(parseBudget(genreConfigs[g].baseHourPrice) * 2.4),
            hour4: Math.round(parseBudget(genreConfigs[g].baseHourPrice) * 2.95)
          }
    }));

    try {
      const res = await fetch("/api/specialist/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roles: obRoles,
          hasStudio: obHasStudio,
          studioImages: obStudioImages,
          city: obCity,
          locationTypes: obLocationTypes,
          equipment: obEquipment,
          pricingGenres: formattedGenres,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setOnboardingStatus(data.status);
      } else {
        setOnboardingError(data.error || "خطا در ثبت اطلاعات تکمیل مشخصات.");
      }
    } catch {
      setOnboardingError("خطا در برقراری ارتباط با سرور.");
    } finally {
      setIsOnboardingPending(false);
    }
  };

  // Simulated exam registration checkout handler
  const handleRegisterExam = (branchName: string, originalPrice: number) => {
    const finalPrice = has100DaysMasterclass ? 0 : originalPrice;
    setExamCheckoutModal({ isOpen: true, branchName, price: finalPrice });
  };

  const handleConfirmExamPayment = () => {
    if (examCheckoutModal) {
      setExamRegisteredBranches((prev) => [...prev, examCheckoutModal.branchName]);
      setExamCheckoutModal(null);
    }
  };

  // Glassmorphic Locked Overlay Component
  const LockOverlay = ({ featureName }: { featureName: string }) => (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        handleLockedClick(featureName);
      }}
      className="absolute inset-0 bg-slate-50/15 backdrop-blur-[6px] rounded-3xl flex flex-col items-center justify-center cursor-pointer select-none group border border-dashed border-slate-300 hover:bg-slate-50/25 transition-all duration-300 z-20"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-amber-400 shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:bg-amber-400 group-hover:text-slate-950">
        <Lock className="h-5 w-5" />
      </div>
      <span className="mt-3 text-[10px] font-black text-slate-900 bg-white border border-slate-200/60 px-3 py-1 rounded-full shadow-sm">
        مخصوص پلن‌های Pro و Ultra
      </span>
    </div>
  );

  // 1. LOADING SCREEN ON START
  if (onboardingStatus === "loading" || isLoadingStorage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        <span className="text-xs font-semibold">در حال بارگذاری اطلاعات پنل...</span>
      </div>
    );
  }

  // 2. WIZARD STEP-BY-STEP ONBOARDING
  if (onboardingStatus === "not_started") {
    return (
      <div className="mx-auto w-full max-w-2xl bg-white/70 border border-slate-200/50 backdrop-blur-xl p-8 rounded-[36px] shadow-2xl animate-fade-in text-right space-y-6" dir="rtl">
        
        {/* Onboarding Header */}
        <header className="pb-4 border-b border-slate-100 flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-amber-500">مراحل تکمیل اطلاعات متخصص</span>
            <h2 className="text-base font-black text-slate-900">راه‌اندازی پروفایل آتلیه و خدمات عکاسی</h2>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-600">
            <span>مرحله {toPersianDigits(obStep)} از ۳</span>
          </div>
        </header>

        {/* Progress Bar Indicator */}
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-amber-400 transition-all duration-300"
            style={{ width: `${(obStep / 3) * 100}%` }}
          />
        </div>

        {/* Step 1: Base & Location Details */}
        {obStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xs font-black text-slate-400 border-r-2 border-amber-400 pr-2">مرحله اول: محدوده و مشخصات لوکیشن</h3>
            
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-slate-400">شهر فعالیت</span>
                <select 
                  value={obCity} 
                  onChange={(e) => setObCity(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-black outline-none focus:ring-2 focus:ring-[#FACC15]"
                >
                  <option value="تهران">تهران</option>
                  <option value="کرج">کرج</option>
                  <option value="شیراز">شیراز</option>
                  <option value="اصفهان">اصفهان</option>
                  <option value="مشهد">مشهد</option>
                  <option value="تبریز">تبریز</option>
                </select>
              </label>

              {/* Studio Toggle */}
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-black text-slate-900">آیا آتلیه یا استودیوی اختصاصی دارید؟</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">در صورت فعال بودن، لوکیشن آتلیه شما به کارفرما معرفی می‌شود.</p>
                  </div>
                  <button
                    onClick={() => setObHasStudio(!obHasStudio)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      obHasStudio ? "bg-amber-400" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        obHasStudio ? "-translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {obHasStudio && (
                  <div className="pt-2 animate-fade-in space-y-2">
                    <span className="mb-2 block text-[10px] font-semibold text-slate-400">تصاویر آتلیه شما (آپلود همزمان):</span>
                    
                    <input 
                      type="file" 
                      ref={studioFilesRef}
                      multiple
                      accept="image/*"
                      onChange={handleStudioFilesSelect}
                      className="hidden"
                    />

                    <div className="flex flex-wrap gap-2.5">
                      {obStudioImages.map((img, i) => (
                        <div key={i} className="h-16 w-20 rounded-xl overflow-hidden border border-slate-200 relative group shadow-sm">
                          <img src={img} className="h-full w-full object-cover" alt="Studio" />
                          <button
                            onClick={() => handleRemoveStudioImage(i)}
                            className="absolute -top-1.5 -left-1.5 h-5.5 w-5.5 rounded-full bg-red-600 text-white flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => studioFilesRef.current?.click()}
                        className="h-16 w-20 rounded-xl border border-dashed border-slate-300 bg-white hover:bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-1 transition-all focus:outline-none"
                      >
                        <ImageIcon className="h-4.5 w-4.5" />
                        <span className="text-[8px] font-black">انتخاب عکس</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Shooting Location Preferences */}
              <div className="space-y-2">
                <span className="mb-1 block text-xs font-semibold text-slate-400 font-black">امکان عکاسی در لوکیشن‌های:</span>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "at_home", label: "منزل مشتری" },
                    { id: "client_location", label: "دفتر/محل کارفرما" },
                    { id: "outdoor", label: "فضای باز / طبیعت" },
                  ].map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => handleToggleLocationType(loc.id)}
                      className={`h-11 rounded-xl border text-[11px] font-black transition-all flex items-center justify-center gap-1.5 ${
                        obLocationTypes.includes(loc.id)
                          ? "bg-amber-400/10 border-amber-400 text-amber-600 shadow-sm"
                          : "border-slate-100 hover:bg-slate-50 text-slate-500"
                      }`}
                    >
                      {obLocationTypes.includes(loc.id) && <CheckIcon className="h-3.5 w-3.5" />}
                      {loc.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setObStep(2)}
                className="inline-flex h-11 items-center gap-1.5 rounded-2xl bg-slate-950 text-white hover:bg-slate-850 px-6 text-xs font-black shadow-sm transition-all focus:outline-none"
              >
                مرحله بعد
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Roles & Equipment Builder */}
        {obStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xs font-black text-slate-400 border-r-2 border-amber-400 pr-2">مرحله دوم: نقش‌ها و تجهیزات کار</h3>

            <div className="space-y-5">
              {/* Role Checks */}
              <div className="space-y-2">
                <span className="mb-1 block text-xs font-semibold text-slate-400 font-black">انتخاب همزمان نقش‌ها در پروژه‌ها:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: "photographer", label: "عکاس" },
                    { id: "videographer", label: "فیلم‌بردار" },
                    { id: "editor", label: "تدوین‌گر / ادیتور" },
                    { id: "model", label: "مدل" },
                  ].map((role) => (
                    <button
                      key={role.id}
                      onClick={() => handleToggleRole(role.id)}
                      className={`h-11 rounded-xl border text-[11px] font-black transition-all flex items-center justify-center gap-1.5 ${
                        obRoles.includes(role.id)
                          ? "bg-amber-400/10 border-amber-400 text-amber-600 shadow-sm"
                          : "border-slate-100 hover:bg-slate-50 text-slate-500"
                      }`}
                    >
                      {obRoles.includes(role.id) && <CheckIcon className="h-3.5 w-3.5" />}
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Equipment Builder */}
              <div className="space-y-3">
                <span className="mb-1 block text-xs font-semibold text-slate-400 font-black">تجهیزات و دوربین‌های عکاسی/فیلمبرداری شما:</span>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={equipmentInput}
                    onChange={(e) => setEquipmentInput(e.target.value)}
                    placeholder="مثال: لنز Canon 50mm f/1.2"
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs text-black placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#FACC15]"
                  />
                  <button
                    onClick={handleAddEquipment}
                    className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 px-4 text-xs font-black flex items-center gap-1 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    افزودن
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {obEquipment.map((eq, i) => (
                    <span 
                      key={i}
                      className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[10px] font-semibold border border-slate-150"
                    >
                      {eq}
                      <button 
                        onClick={() => handleRemoveEquipment(eq)}
                        className="text-red-500 hover:text-red-700 font-bold ml-1 focus:outline-none"
                      >
                        ✕
                      </button>
                    </span>
                  ))}

                  {obEquipment.length === 0 && (
                    <span className="text-[10px] text-slate-400 font-semibold italic">لیست تجهیزات خالی است. حداقل یک مورد اضافه کنید.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setObStep(1)}
                className="inline-flex h-11 items-center gap-1.5 rounded-2xl bg-slate-100 text-slate-800 hover:bg-slate-200 px-5 text-xs font-black transition-all focus:outline-none"
              >
                مرحله قبل
              </button>
              <button
                onClick={() => setObStep(3)}
                className="inline-flex h-11 items-center gap-1.5 rounded-2xl bg-slate-950 text-white hover:bg-slate-850 px-6 text-xs font-black shadow-sm transition-all focus:outline-none"
              >
                مرحله بعد
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Genres & Pricing Configurations */}
        {obStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xs font-black text-slate-400 border-r-2 border-amber-400 pr-2">مرحله سوم: ژانرهای عکاسی و پکیج‌های قیمت‌گذاری</h3>

            <div className="space-y-6">
              {/* Select Genres */}
              <div className="space-y-2">
                <span className="mb-1 block text-xs font-semibold text-slate-400 font-black font-extrabold">ژانرهای عکاسی تحت تخصص:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: "portrait", label: "عکاسی پرتره" },
                    { id: "birthday", label: "تولد و کودک" },
                    { id: "commercial", label: "تبلیغاتی و محصول" },
                    { id: "wedding", label: "عروسی و فرمالیته" },
                  ].map((genre) => (
                    <button
                      key={genre.id}
                      onClick={() => handleToggleGenre(genre.id)}
                      className={`h-11 rounded-xl border text-[11px] font-black transition-all flex items-center justify-center gap-1.5 ${
                        selectedGenres.includes(genre.id)
                          ? "bg-amber-400/10 border-amber-400 text-amber-600 shadow-sm"
                          : "border-slate-100 hover:bg-slate-50 text-slate-500"
                      }`}
                    >
                      {selectedGenres.includes(genre.id) && <CheckIcon className="h-3.5 w-3.5" />}
                      {genre.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Configurations for each selected genre */}
              <div className="space-y-6 pt-2">
                {selectedGenres.map((genre) => {
                  const baseHourPriceNum = parseBudget(genreConfigs[genre].baseHourPrice);
                  
                  return (
                    <div 
                      key={genre}
                      className="p-5 rounded-[24px] border border-slate-200/60 bg-slate-50/50 space-y-4 text-right"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <h4 className="text-xs font-black text-slate-900">
                          تنظیمات قیمت پکیج: <span className="text-amber-500 font-extrabold">
                            {genre === "portrait" ? "پرتره" : genre === "birthday" ? "تولد و کودک" : genre === "commercial" ? "تبلیغاتی و محصول" : "عروسی و فرمالیته"}
                          </span>
                        </h4>
                        <span className="text-[9px] font-semibold text-slate-400">ساعتی / پکیجی</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="block">
                          <span className="mb-2 block text-[10px] font-semibold text-slate-400">هزینه ساعت اول (تومان)</span>
                          <input
                            type="text"
                            value={genreConfigs[genre].baseHourPrice}
                            onChange={(e) => handleUpdateGenreConfig(genre, "baseHourPrice", e.target.value)}
                            placeholder="مثال: ۱۲۰۰۰۰۰"
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-black outline-none focus:ring-2 focus:ring-[#FACC15]"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-[10px] font-semibold text-slate-400">تعداد شات تحویلی ساعت اول</span>
                          <input
                            type="text"
                            value={genreConfigs[genre].baseDeliveredShots}
                            onChange={(e) => handleUpdateGenreConfig(genre, "baseDeliveredShots", e.target.value)}
                            placeholder="مثال: ۳۵"
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-black outline-none focus:ring-2 focus:ring-[#FACC15]"
                          />
                        </label>
                      </div>

                      {/* Includes editing checkbox */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-500 font-semibold">پکیج شامل ادیت عکس‌ها می‌شود؟</span>
                        <button
                          onClick={() => handleUpdateGenreConfig(genre, "includesEditing", !genreConfigs[genre].includesEditing)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                            genreConfigs[genre].includesEditing ? "bg-emerald-500" : "bg-slate-350"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              genreConfigs[genre].includesEditing ? "-translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Pricing Strategy switch */}
                      <div className="pt-2 space-y-3">
                        <span className="text-[10px] font-semibold text-slate-400 block mb-1">استراتژی قیمت‌گذاری ساعات اضافی:</span>
                        <div className="flex gap-1.5 p-1 bg-white border border-slate-150 rounded-xl">
                          {(["manual", "decreasing_percentage"] as const).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => handleUpdateGenreConfig(genre, "pricingStrategyType", type)}
                              className={`flex-1 text-[9px] font-black py-1.5 rounded-lg transition-all ${
                                genreConfigs[genre].pricingStrategyType === type
                                  ? "bg-slate-900 text-white shadow-sm"
                                  : "text-slate-400 hover:text-slate-900 hover:bg-slate-100/50"
                              }`}
                            >
                              {type === "manual" ? "دستی (دلخواه)" : "نزولی درصدی (پیشنهادی)"}
                            </button>
                          ))}
                        </div>

                        {/* LIVE PRICING PREVIEW TABLE FOR DECREASING PERCENTAGE */}
                        {genreConfigs[genre].pricingStrategyType === "decreasing_percentage" && baseHourPriceNum > 0 && (
                          <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 text-[10px] leading-relaxed font-semibold space-y-2.5 animate-fade-in relative overflow-hidden">
                            <div className="absolute -right-12 -bottom-12 w-24 h-24 bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />
                            <p className="font-black text-amber-400 flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5" />
                              پیش‌نمایش زنده قیمت‌گذاری با الگوریتم تخفیف نزولی پلتفرم:
                            </p>
                            <div className="grid grid-cols-4 gap-2 pt-1.5 text-center border-t border-slate-800">
                              <div className="space-y-1">
                                <span className="block text-[8px] text-slate-500">۱ ساعت</span>
                                <span className="block text-slate-200 truncate">{toPersianDigits(baseHourPriceNum.toLocaleString("fa-IR"))}</span>
                              </div>
                              <div className="space-y-1 border-r border-slate-800">
                                <span className="block text-[8px] text-slate-500">۲ ساعت (۱۵٪ تخفیف)</span>
                                <span className="block text-slate-200 truncate">{toPersianDigits(Math.round(baseHourPriceNum * 1.75).toLocaleString("fa-IR"))}</span>
                              </div>
                              <div className="space-y-1 border-r border-slate-800">
                                <span className="block text-[8px] text-slate-500">۳ ساعت (۲۰٪ تخفیف)</span>
                                <span className="block text-slate-200 truncate">{toPersianDigits(Math.round(baseHourPriceNum * 2.4).toLocaleString("fa-IR"))}</span>
                              </div>
                              <div className="space-y-1 border-r border-slate-800">
                                <span className="block text-[8px] text-slate-500">۴ ساعت (۲۵٪ تخفیف)</span>
                                <span className="block text-slate-200 truncate">{toPersianDigits(Math.round(baseHourPriceNum * 2.95).toLocaleString("fa-IR"))}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Manual inputs fields if manual type is selected */}
                        {genreConfigs[genre].pricingStrategyType === "manual" && (
                          <div className="grid grid-cols-3 gap-3 pt-1 animate-fade-in">
                            <label className="block">
                              <span className="mb-1 block text-[9px] font-semibold text-slate-400">کل ۲ ساعت (تومان)</span>
                              <input
                                type="text"
                                value={genreConfigs[genre].hour2Price}
                                onChange={(e) => handleUpdateGenreConfig(genre, "hour2Price", e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-black outline-none focus:ring-2 focus:ring-[#FACC15]"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-1 block text-[9px] font-semibold text-slate-400">کل ۳ ساعت (تومان)</span>
                              <input
                                type="text"
                                value={genreConfigs[genre].hour3Price}
                                onChange={(e) => handleUpdateGenreConfig(genre, "hour3Price", e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-black outline-none focus:ring-2 focus:ring-[#FACC15]"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-1 block text-[9px] font-semibold text-slate-400">کل ۴ ساعت (تومان)</span>
                              <input
                                type="text"
                                value={genreConfigs[genre].hour4Price}
                                onChange={(e) => handleUpdateGenreConfig(genre, "hour4Price", e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-black outline-none focus:ring-2 focus:ring-[#FACC15]"
                              />
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Portfolio images multi upload previews */}
                      <div className="pt-2 space-y-2">
                        <span className="mb-2 block text-[10px] font-semibold text-slate-400">نمونه کارها (آپلود همزمان):</span>
                        
                        <input
                          type="file"
                          ref={(el) => { genreFilesRefs.current[genre] = el; }}
                          multiple
                          accept="image/*"
                          onChange={(e) => handlePortfolioFilesSelect(genre, e)}
                          className="hidden"
                        />

                        <div className="flex flex-wrap gap-2">
                          {genreConfigs[genre].portfolioImages.map((img, idx) => (
                            <div key={idx} className="h-12 w-16 rounded-lg overflow-hidden border border-slate-200 relative group shadow-sm">
                              <img src={img} className="h-full w-full object-cover" alt="Portfolio" />
                              <button
                                onClick={() => handleRemovePortfolioImage(genre, idx)}
                                className="absolute -top-1.5 -left-1.5 h-4.5 w-4.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[8px] shadow opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => genreFilesRefs.current[genre]?.click()}
                            className="h-12 w-16 rounded-lg border border-dashed border-slate-300 bg-white hover:bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-0.5 transition-all focus:outline-none"
                          >
                            <Camera className="h-4 w-4" />
                            <span className="text-[7px] font-black">انتخاب عکس</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {onboardingError && (
              <p className="text-xs font-black text-red-600">{onboardingError}</p>
            )}

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setObStep(2)}
                className="inline-flex h-11 items-center gap-1.5 rounded-2xl bg-slate-100 text-slate-800 hover:bg-slate-200 px-5 text-xs font-black transition-all focus:outline-none"
              >
                مرحله قبل
              </button>
              
              <button
                onClick={handleOnboardingSubmit}
                disabled={isOnboardingPending}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-amber-400 text-slate-950 px-6 text-xs font-black shadow-md transition-all hover:bg-amber-500 active:scale-95 disabled:opacity-55"
              >
                {isOnboardingPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    در حال ثبت اطلاعات...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    تکمیل و ارسال جهت تایید
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    );
  }

  // 3. PENDING REVIEW SCREEN FOR ONBOARDED SPECIALISTS
  if (onboardingStatus === "pending_approval") {
    return (
      <div className="mx-auto w-full max-w-xl bg-white/70 border border-slate-200/50 backdrop-blur-xl p-8 rounded-[36px] shadow-2xl text-center animate-fade-in text-right space-y-6" dir="rtl">
        <div className="flex flex-col items-center gap-4 text-center pb-4 border-b border-slate-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-500 animate-pulse shadow-glow shadow-amber-400/10">
            <Clock className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900">پروفایل شما در دست بررسی ادمین قرار دارد</h2>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed px-4">
            مدارک، تجهیزات ثبت‌شده و پکیج‌های ژانر قیمت‌گذاری شما با موفقیت دریافت گردید. ادمین‌های پلتفرم «جار» حداکثر تا ۲۴ ساعت آینده پروفایل شما را بررسی و فعال خواهند کرد.
          </p>
        </div>

        {/* Read-only preview of submitted onboarding specs to keep users engaged */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-black text-slate-800">مشخصات ثبت شده شما:</h3>
          
          <div className="space-y-3.5 text-xs text-slate-600 font-semibold bg-slate-50/50 border border-slate-100 p-5 rounded-3xl">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">شهر فعالیت:</span>
              <span className="font-bold text-slate-900">{obCity}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-400">نقش‌های شما:</span>
              <span className="font-bold text-slate-900">
                {obRoles.map((r) => r === "photographer" ? "عکاس" : r === "videographer" ? "فیلم‌بردار" : r === "editor" ? "ادیتور" : "مدل").join(" • ")}
              </span>
            </div>

            <div className="flex justify-between items-start">
              <span className="text-slate-400 shrink-0">تجهیزات ثبت‌شده:</span>
              <span className="font-bold text-slate-900 text-left pl-2 leading-relaxed max-w-[260px]">
                {obEquipment.join(" • ") || "—"}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
              <span className="text-slate-400">ژانرها و نمونه‌کارها:</span>
              <span className="font-black text-amber-600">
                {selectedGenres.map((g) => g === "portrait" ? "پرتره" : g === "birthday" ? "تولد" : g === "commercial" ? "تبلیغاتی" : "عروسی").join(" ، ")}
              </span>
            </div>
          </div>
        </div>

        {/* Back option or logout link */}
        <div className="flex justify-center pt-2">
          <Link
            href="/login"
            className="text-xs font-black text-slate-400 hover:text-slate-600 focus:outline-none"
          >
            خروج از حساب کاربری
          </Link>
        </div>
      </div>
    );
  }

  // 4. APPROVED VIEW (Normal fully active Dashboard Workspace)
  const mockArchivedProjects = [
    {
      id: "arc-1",
      title: "عکاسی فرمالیته عروسی در کویر مرنجاب",
      client: "سعید کریمی",
      budget: "۸,۵۰۰,۰۰۰",
      date: "۲۲ خرداد ۱۴۰۵",
      statusLabel: "تحویل نهایی",
      statusColor: "text-emerald-500 bg-emerald-50 border-emerald-100",
    },
    {
      id: "arc-2",
      title: "عکاسی صنعتی و تبلیغاتی کاتالوگ دیجی‌کالا",
      client: "صنایع آرایشی درسا",
      budget: "۴,۲۰۰,۰۰۰",
      date: "۰۵ اردیبهشت ۱۴۰۵",
      statusLabel: "بایگانی",
      statusColor: "text-slate-500 bg-slate-50 border-slate-105",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1360px] text-right animate-fade-in pb-12" dir="rtl">
      
      {/* Checkout Modal for blue badge exam */}
      {examCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-md px-4">
          <div className="bg-white border border-slate-100 p-7 rounded-[32px] max-w-sm w-full shadow-2xl relative animate-fade-in text-right space-y-5">
            <button
              onClick={() => setExamCheckoutModal(null)}
              className="absolute top-5 left-5 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors focus:outline-none"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
              <Sparkles className="h-5 w-5 text-blue-500 fill-blue-100 animate-pulse" />
              <h3 className="text-sm font-black text-slate-900">ثبت‌نام آزمون تیک آبی اصالت</h3>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 font-semibold bg-slate-50 p-4 rounded-2xl border border-slate-150">
              <div className="flex justify-between">
                <span>شاخه انتخابی:</span>
                <span className="font-black text-slate-950">{examCheckoutModal.branchName}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/60 pt-2.5">
                <span>هزینه آزمون رسمی:</span>
                {examCheckoutModal.price === 0 ? (
                  <span className="text-emerald-600 font-black flex items-center gap-1">
                    رایگان
                    <span className="text-[8px] bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">آفر مسترکلاس</span>
                  </span>
                ) : (
                  <span className="font-black text-slate-900">{toPersianDigits(examCheckoutModal.price.toLocaleString("fa-IR"))} تومان</span>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-1">
              <button
                type="button"
                onClick={handleConfirmExamPayment}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 text-white px-6 text-xs font-black shadow-md transition-all hover:bg-blue-700 active:scale-95"
              >
                تایید ثبت‌نام و فعالسازی
              </button>
              <button
                type="button"
                onClick={() => setExamCheckoutModal(null)}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 px-5 text-xs font-black transition-all hover:bg-slate-200"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Glassmorphic Upgrade Modal */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md px-4">
          <div className="bg-white/80 border border-slate-200/50 backdrop-blur-xl p-8 rounded-[36px] max-w-md w-full shadow-2xl relative animate-fade-in text-right">
            
            <button
              onClick={() => setIsUpgradeModalOpen(false)}
              className="absolute top-5 left-5 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors focus:outline-none"
            >
              ✕
            </button>

            <div className="flex flex-col items-center gap-4 text-center mt-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20">
                <Sparkles className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-black text-slate-900">ارتقا به نسخه‌های حرفه‌ای</h3>
              
              <p className="text-xs text-slate-500 font-semibold leading-relaxed px-2">
                قابلیت <strong className="text-amber-600 font-extrabold">«{lockedFeatureName}»</strong> منحصراً در پلن‌های Pro و Ultra فعال است. برای فعالسازی دسترسی و حذف کلیه محدودیت‌های آپلود و فضا، حساب خود را ارتقا دهید.
              </p>

              <div className="flex flex-col gap-2.5 w-full mt-6">
                <Link
                  href="/profile/upgrade"
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 text-white hover:bg-slate-850 text-xs font-black transition-all shadow-sm focus:outline-none active:scale-[0.98]"
                >
                  مشاهده پلن‌ها و ارتقای حساب
                </Link>
                <button
                  onClick={() => setIsUpgradeModalOpen(false)}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 hover:bg-slate-200 text-xs font-black transition-all focus:outline-none"
                >
                  انصراف و بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Creation Form Dialog */}
      {isCreatingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-md px-4">
          <div className="bg-white border border-slate-100 p-7 rounded-[32px] max-w-md w-full shadow-2xl relative animate-fade-in text-right space-y-5">
            <button
              onClick={() => setIsCreatingProject(false)}
              className="absolute top-5 left-5 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors focus:outline-none"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
              <FolderPlus className="h-5 w-5 text-amber-500" />
              <h3 className="text-sm font-black text-slate-900">ایجاد پوشه پروژه جدید</h3>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-slate-400">نام پروژه</span>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="مثال: تیزر تبلیغاتی کویر تایر"
                  className={inputClasses}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-slate-400">نام کارفرما</span>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="نام مشتری یا کمپانی"
                  className={inputClasses}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-slate-400">بودجه پروژه (تومان)</span>
                <input
                  type="text"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  placeholder="مثال: ۱۲,۰۰۰,۰۰۰"
                  className={inputClasses}
                />
              </label>
            </div>

            {creationError && (
              <p className="text-xs font-black text-red-650">{creationError}</p>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={handleCreateProjectFolder}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 px-6 text-xs font-black shadow-sm transition-all hover:bg-amber-500 active:scale-95"
              >
                ایجاد پوشه و سینک درایو
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingProject(false)}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 px-5 text-xs font-black transition-all hover:bg-slate-200"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Switcher Bar */}
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50 p-4 border border-slate-100 rounded-3xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isOnline ? "bg-emerald-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isOnline ? "-translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className={`text-xs font-black ${isOnline ? "text-emerald-600 animate-pulse" : "text-slate-400"}`}>
            {isOnline ? "آماده پذیرش پروژه (آنلاین)" : "مشغول (آفلاین)"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/specialist/projects"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#FFB400] hover:bg-[#F59E0B] px-4 text-xs font-black text-slate-950 transition-all duration-200 active:scale-95 shadow-sm"
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>کارتابل پروژه‌های باز</span>
          </Link>

          <Link
            href="/profile?role=customer"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-850 px-4 text-xs font-black text-white transition-all duration-200 active:scale-95 shadow-sm"
          >
            سوییچ به حالت کارفرما
          </Link>
        </div>
      </div>

      {/* Header Info */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-slate-100 pb-6 mb-8">
        <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-100 ring-2 ring-amber-400/40 shadow-sm">
              <User className="h-7 w-7 text-slate-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-950 truncate">{name}</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-slate-950 text-white shadow-sm shrink-0">
                  <Zap className="h-2.5 w-2.5 text-amber-400 fill-amber-400 animate-pulse" />
                  پنل متخصص
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400 font-semibold" dir="ltr">
                {user.phoneDisplay}
              </p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex h-10 w-10 sm:hidden shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors focus:outline-none"
            title="خروج از حساب"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href="/profile/upgrade"
            className="inline-flex h-10 flex-1 sm:flex-none items-center justify-center rounded-2xl bg-slate-50 border border-slate-200/60 px-5 text-xs font-black text-slate-950 hover:bg-slate-100 transition-all duration-200 active:scale-95 shrink-0"
          >
            <Award className="h-4 w-4 text-amber-500 ml-1.5" />
            مدیریت اشتراک و ارتقای پنل
          </Link>
          <button
            onClick={() => logout()}
            className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors focus:outline-none"
            title="خروج از حساب"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Premium Business Analytics Cards (Locked or Dynamic based on Tier) */}
      <div className="mb-8 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative">
          
          {/* Card 1: Revenue */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col justify-between min-h-[110px] text-right">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black">درآمد این ماه</span>
              <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
            </div>
            <p className={`mt-3 transition-all duration-300 flex items-baseline gap-1 ${userTier === "BASIC" ? "filter blur-sm select-none" : ""}`}>
              <span className="text-2xl font-black text-slate-900">
                {userTier === "BASIC" ? "۱۲,۷۰۰,۰۰۰" : toPersianDigits(totalRevenue.toLocaleString("fa-IR"))}
              </span>
              <span className="text-xs text-gray-500 font-semibold">تومان</span>
            </p>
          </div>

          {/* Card 2: Active Projects */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col justify-between min-h-[110px] text-right">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black">پروژه‌های فعال</span>
              <Briefcase className="h-4.5 w-4.5 text-amber-500" />
            </div>
            <p className={`mt-3 transition-all duration-300 flex items-baseline gap-1 ${userTier === "BASIC" ? "filter blur-sm select-none" : ""}`}>
              <span className="text-2xl font-black text-slate-900">
                {userTier === "BASIC" ? "۰" : toPersianDigits(activeProjectsCount)}
              </span>
              <span className="text-xs text-gray-500 font-semibold">پروژه</span>
            </p>
          </div>

          {/* Card 3: Total Clients */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col justify-between min-h-[110px] text-right">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black">کل کارفرمایان</span>
              <Users className="h-4.5 w-4.5 text-blue-500" />
            </div>
            <p className={`mt-3 transition-all duration-300 flex items-baseline gap-1 ${userTier === "BASIC" ? "filter blur-sm select-none" : ""}`}>
              <span className="text-2xl font-black text-slate-900">
                {userTier === "BASIC" ? "۰" : toPersianDigits(uniqueClientsCount)}
              </span>
              <span className="text-xs text-gray-500 font-semibold">کارفرما</span>
            </p>
          </div>

          {/* Card 4: Proposal Conversion Rate */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col justify-between min-h-[110px] text-right">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black">نرخ تبدیل پروپوزال</span>
              <Percent className="h-4.5 w-4.5 text-indigo-500" />
            </div>
            <p className={`mt-3 transition-all duration-300 flex items-baseline gap-1 ${userTier === "BASIC" ? "filter blur-sm select-none" : ""}`}>
              <span className="text-2xl font-black text-slate-900">
                {userTier === "BASIC" ? "۰" : toPersianDigits(conversionRate)}
              </span>
              <span className="text-xs text-gray-500 font-semibold">٪</span>
            </p>
          </div>

        </div>

        {/* BASIC Tier Lock Warning Banner & CTA */}
        {userTier === "BASIC" && (
          <div className="bg-slate-950 p-5 rounded-3xl text-white border border-slate-900 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative overflow-hidden group animate-fade-in">
            <div className="pointer-events-none absolute -right-20 -bottom-20 w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-125" />
            
            <div className="space-y-1.5 z-10">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[10px] font-black text-amber-400">حساب کاربری بیسیک محدود شده</span>
              </div>
              <h4 className="text-xs font-black text-slate-100">به دلیل استفاده از پنل بیسیک، امکان درآمدزایی آنلاین و ثبت تراکنش برای شما فعال نیست.</h4>
              <p className="text-[9px] text-slate-400 font-semibold">برای فعالسازی درگاه پرداخت آنلاین، ثبت مبالغ مالی پروژه‌ها و گزارش‌دهی خودکار، حساب خود را ارتقا دهید.</p>
            </div>

            <button
              onClick={() => handleLockedClick("آمارهای تجاری و مالی")}
              className="inline-flex h-10 items-center justify-center rounded-2xl bg-white hover:bg-slate-100 text-slate-955 px-5 text-xs font-black shadow-sm transition-all duration-200 active:scale-95 shrink-0 z-10 text-center focus:outline-none"
            >
              ارتقای آنی به پنل Ultra
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Sidebar (left) and File Manager / Navigation (right) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Left Column (Sidebar - Tier Status & Cloud Storage) */}
        <div className="md:col-span-1 flex flex-col gap-6 w-full">
          
          {/* Card 1: Subscription Tier Info & Tester Switcher */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm text-right space-y-4">
            <h3 className="text-sm font-black text-slate-900">مشخصات اشتراک شما</h3>
            
            <div className="space-y-3 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">پلن فعال:</span>
                <span className="font-black text-slate-950">{specialistTier.name}</span>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">اعتبار سنجی:</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9px] font-black ${specialistTier.badgeColor}`}>
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  {specialistTier.badge}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">محدوده لوکیشن:</span>
                <div className="flex items-center gap-1 text-slate-800 font-semibold">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {specialistTier.location}
                </div>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">بازدید این هفته:</span>
                <span className="font-black text-slate-900">{specialistTier.viewsCount}</span>
              </div>
            </div>


          </div>

          {/* Card 2: Cloud Storage Progress Bar (Locked or Visible depending on Tier) */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm text-right space-y-4 relative overflow-hidden">
            {userTier === "BASIC" && <LockOverlay featureName="مدیریت فضای ابری اختصاصی" />}

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">فضای ابری اختصاصی</h3>
              <Cloud className="h-4.5 w-4.5 text-slate-400" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                <span>{specialistTier.storageUsed} استفاده شده</span>
                <span>کل ظرفیت: {specialistTier.storageTotal}</span>
              </div>
              
              {/* Progress track */}
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden relative">
                <div 
                  className="h-full rounded-full bg-amber-400 shadow-glow transition-all duration-500" 
                  style={{ width: `${Math.min(specialistTier.storagePercent, 100)}%` }}
                />
              </div>
              
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed pt-1">
                از این فضا برای آپلود فاکتورها، پیش‌نویس طرح‌ها و تحویل نهایی مدارک پروژه‌ها استفاده می‌شود.
              </p>
            </div>
          </div>

        </div>

        {/* Right Column (Main content - Navigation Tabs & Finder File Explorer) */}
        <div className="md:col-span-2 flex flex-col gap-6 w-full min-w-0">
          
          {/* Tabs Navigation */}
          <nav className="flex gap-3 overflow-x-auto scrollbar-hide rounded-2xl border border-slate-100 bg-slate-50 p-1.5 select-none">
            <button
              onClick={() => {
                setActiveTab("active-projects");
                setActiveProject(null);
              }}
              className={`flex-1 min-w-[100px] text-center rounded-xl py-2.5 text-xs font-black transition-all ${
                activeTab === "active-projects"
                  ? "bg-amber-400 text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              فایل منیجر پروژه‌ها
            </button>
            
            <button
              onClick={() => setActiveTab("verification")}
              className={`flex-1 min-w-[100px] text-center rounded-xl py-2.5 text-xs font-black transition-all ${
                activeTab === "verification"
                  ? "bg-amber-400 text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              تیک اصالت جارآموز
            </button>

            <button
              onClick={() => setActiveTab("archive")}
              className={`flex-1 min-w-[100px] text-center rounded-xl py-2.5 text-xs font-black transition-all ${
                activeTab === "archive"
                  ? "bg-amber-400 text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              آرشیو کارها
            </button>
            
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex-1 min-w-[100px] text-center rounded-xl py-2.5 text-xs font-black transition-all ${
                activeTab === "settings"
                  ? "bg-amber-400 text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              تنظیمات متخصص
            </button>
          </nav>

          {/* Tab Contents */}
          <div className="space-y-4">
            
            {/* 1. Projects File Explorer Tab */}
            {activeTab === "active-projects" && (
              <div className="space-y-4">
                
                {/* Case 1.1: Grid View of Projects (No activeProject selected) */}
                {!activeProject ? (
                  <div className="space-y-4 animate-fade-in">
                    
                    {/* Header bar of Finder with "New Project" action */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900">پوشه اصلی فایل‌ها (Finder)</h3>
                      
                      <button
                        onClick={() => {
                          const isBasicLocked = userTier === "BASIC" && projectsList.length >= 1;
                          if (isBasicLocked) {
                            handleLockedClick("ساخت بیش از ۱ پروژه");
                          } else {
                            setIsCreatingProject(true);
                          }
                        }}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-slate-950 text-white hover:bg-slate-850 px-4 text-xs font-black transition-all shadow-sm active:scale-95"
                      >
                        <FolderPlus className="h-4 w-4" />
                        پوشه پروژه جدید
                      </button>
                    </div>

                    {/* Finder Folders Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {projectsList.map((project) => (
                        <div
                          key={project.id}
                          onClick={() => {
                            setActiveProject(project);
                            fetchProjectFiles(project.id);
                          }}
                          className="p-5 rounded-3xl border border-slate-100 bg-white hover:border-amber-400 hover:shadow-md cursor-pointer transition-all duration-200 flex items-start gap-4 text-right select-none"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-500">
                            <Folder className="h-6 w-6 fill-amber-400/20" />
                          </div>
                          
                          <div className="min-w-0 flex-1 space-y-1">
                            <h4 className="text-sm font-black text-slate-900 truncate">
                              {project.projectName}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-semibold truncate">
                              کارفرما: <span className="text-slate-700 font-bold">{project.clientName}</span>
                            </p>
                            <p className="text-[9px] text-slate-400 font-semibold flex justify-between items-center pt-2">
                              <span>حجم: {formatBytes(project.totalSize)}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${
                                project.status === "delivered" 
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                                  : "bg-amber-50 text-amber-600 border border-amber-100"
                              }`}>
                                {project.status === "delivered" ? "تحویل شده" : "در حال ادیت"}
                              </span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {projectsList.length === 0 && (
                      <div className="text-center py-10 border border-slate-100 rounded-3xl bg-slate-50/50">
                        <p className="text-xs font-semibold text-slate-400">هیچ پوشه پروژه‌ای ایجاد نشده است.</p>
                      </div>
                    )}

                    {/* Premium mock studio statistics card (Studio Pro Tools) */}
                    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm text-right relative overflow-hidden min-h-[140px] flex flex-col justify-between">
                      {userTier === "BASIC" && <LockOverlay featureName="ابزارهای تحلیل پیشرفته آتلیه" />}
                      
                      <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                            <BarChart3 className="h-4.5 w-4.5" />
                          </div>
                          <h4 className="text-xs font-black text-slate-900">ابزارهای تحلیل پیشرفته آتلیه (Studio Pro Tools)</h4>
                        </div>
                        <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">Pro Active</span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-3 text-center">
                        <div className="space-y-1">
                          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-semibold">
                            <Eye className="h-3 w-3" />
                            نرخ کلیک
                          </div>
                          <p className="text-sm font-black text-slate-900">۱۴/۲٪</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-semibold">
                            <Calendar className="h-3 w-3" />
                            رزرو کلید
                          </div>
                          <p className="text-sm font-black text-slate-900">۸ مورد</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-semibold">
                            <Zap className="h-3 w-3" />
                            رتبه نمایش
                          </div>
                          <p className="text-sm font-black text-slate-950">ممتاز نقره‌ای</p>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  // Case 1.2: Inner Workspace Folder View (activeProject selected)
                  <div className="space-y-4 animate-fade-in">
                    
                    {/* Back Breadcrumbs */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-400">
                        <button 
                          onClick={() => setActiveProject(null)}
                          className="hover:text-slate-950 flex items-center gap-1"
                        >
                          پروژه‌ها
                        </button>
                        <span>/</span>
                        <span className="text-slate-900">{activeProject.projectName}</span>
                      </div>

                      <button
                        onClick={() => setActiveProject(null)}
                        className="inline-flex h-8 items-center justify-center gap-1 rounded-xl bg-slate-50 border border-slate-200/60 px-3 text-[10px] font-black text-slate-800 hover:bg-slate-100 transition-all focus:outline-none"
                      >
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        بازگشت به فایندر
                      </button>
                    </div>

                    {/* Drag and Drop Project Delivery Box (Glassmorphism theme) */}
                    <div 
                      className={`rounded-3xl border p-6 text-center transition-all duration-300 relative overflow-hidden backdrop-blur-md bg-white/65 shadow-sm ${
                        dragActive 
                          ? "border-amber-400 bg-amber-50/20 scale-[1.01]" 
                          : "border-slate-200 border-dashed hover:border-slate-300"
                      }`}
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                    >
                      {userTier === "BASIC" && <LockOverlay featureName="تحویل فایل‌های پروژه (فضای ابری)" />}

                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        disabled={userTier === "BASIC"}
                        onChange={handleFileInput}
                      />

                      {uploadStatus === "idle" && (
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                            <UploadCloud className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900">تحویل نهایی فایل به این پروژه</h4>
                            <p className="mt-1.5 text-xs text-slate-400 font-semibold leading-relaxed">
                              فایل خروجی خود (ZIP، عکاسی یا ویدیو) را به اینجا بکشید یا{" "}
                              <button 
                                disabled={userTier === "BASIC"}
                                onClick={() => fileInputRef.current?.click()} 
                                className="text-amber-500 font-black hover:underline focus:outline-none disabled:opacity-50"
                              >
                                کلیک کنید تا فایل انتخاب شود
                              </button>
                            </p>
                          </div>
                        </div>
                      )}

                      {uploadStatus === "uploading" && (
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 animate-bounce">
                            <FileText className="h-6 w-6" />
                          </div>
                          <div className="w-full max-w-xs space-y-2">
                            <h4 className="text-xs font-black text-slate-900 truncate">در حال آپلود: {fileName}</h4>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-amber-400 transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-black text-slate-500">{uploadProgress}٪ تکمیل شده</span>
                          </div>
                        </div>
                      )}

                      {uploadStatus === "success" && (
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                            <Check className="h-6 w-6" />
                          </div>
                          <div className="w-full max-w-md space-y-3">
                            <h4 className="text-sm font-black text-slate-900">آپلود موفقیت‌آمیز بود!</h4>
                            <p className="text-[10px] text-slate-400 font-semibold">لینک مستقیم گوگل درایو برای تحویل به کارفرما آماده است.</p>
                            
                            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-150">
                              <span className="text-[10px] text-slate-500 truncate flex-1 pl-2 text-left" dir="ltr">
                                {uploadedFileLink}
                              </span>
                              <button
                                onClick={copyToClipboard}
                                className="h-8 px-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-black flex items-center gap-1 transition-all shrink-0"
                              >
                                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                {copied ? "کپی شد" : "کپی لینک"}
                              </button>
                            </div>

                            <button 
                              onClick={() => setUploadStatus("idle")}
                              className="text-[10px] font-black text-slate-400 hover:text-slate-650 focus:outline-none"
                            >
                              ارسال فایل دیگر
                            </button>
                          </div>
                        </div>
                      )}

                      {uploadStatus === "error" && (
                        <div className="flex flex-col items-center gap-3 animate-fade-in">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 font-black">
                            !
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900">خطایی رخ داد</h4>
                            <p className="mt-1 text-xs text-red-600 font-semibold leading-relaxed">
                              {uploadErrorMessage || "آپلود فایل به درایو با شکست مواجه شد. لطفاً دوباره تلاش کنید."}
                            </p>
                            <button 
                              onClick={() => setUploadStatus("idle")}
                              className="mt-3 h-8 px-4 rounded-xl bg-slate-100 text-slate-950 text-[10px] font-black hover:bg-slate-200 transition-all focus:outline-none"
                            >
                              تلاش مجدد
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Files List Inside Project Folder */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-black text-slate-900">فایل‌های تحویل شده پروژه:</h4>
                      
                      {isLoadingFiles ? (
                        <div className="flex justify-center py-6 text-slate-450 gap-2 items-center text-xs">
                          <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                          <span>در حال دریافت فایل‌ها از گوگل درایو...</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {projectFiles.map((file) => (
                            <div 
                              key={file.id}
                              className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between gap-4 text-right"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 shrink-0">
                                  <File className="h-4.5 w-4.5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-slate-900 truncate pl-4">{file.name}</p>
                                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5">حجم فایل: {formatBytes(file.size)}</p>
                                </div>
                              </div>

                              <a
                                href={file.downloadLink || file.link}
                                target="_blank"
                                rel="noreferrer"
                                className="h-8 px-3 rounded-xl bg-slate-50 border border-slate-200/60 hover:bg-slate-100 text-slate-800 text-[10px] font-black flex items-center gap-1 transition-all shrink-0 focus:outline-none"
                              >
                                <Download className="h-3 w-3" />
                                دانلود فایل
                              </a>
                            </div>
                          ))}

                          {projectFiles.length === 0 && (
                            <div className="text-center py-8 border border-slate-100 border-dashed rounded-2xl bg-slate-50/30">
                              <p className="text-[10px] font-semibold text-slate-400">هیچ فایلی هنوز آپلود نشده است.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                )}

              </div>
            )}

            {/* 2. Verification (تیک اصالت) Tab */}
            {activeTab === "verification" && (
              <div className="space-y-6 animate-fade-in text-right">
                
                {/* Intro card */}
                <div className="p-6 rounded-[32px] border border-slate-100 bg-white shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <BlueBadgeIcon className="h-7 w-7" />
                    <h3 className="text-sm font-black text-slate-900">طرح اعطای تیک اصالت و تایید مهارت جارآموز</h3>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    پلتفرم جار به جهت تضمین اصالت تخصص و کیفیت خروجی عکاسان و فیلمبرداران، اقدام به اعطای تیک آبی اصالت مهارت می‌نماید. متخصصان دارای تیک آبی با اولویت بالاتری به کارفرمایان معرفی شده و از تعرفه‌های برتر درآمدزایی برخوردار می‌شوند.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                      <h4 className="text-xs font-black text-slate-900">راهکار اول: آزمون مستقیم</h4>
                      <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">ثبت‌نام مستقیم در سنجش عملی و تحویل حضوری لوح فیزیکی اصالت جارآموز.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-200/50 space-y-1">
                      <h4 className="text-xs font-black text-amber-900">راهکار دوم: عضویت در دوره‌ها (آفر ویژه)</h4>
                      <p className="text-[10px] text-amber-700 font-semibold leading-relaxed">با خرید مسترکلاس ۱۰۰ روزه عکاسی، هزینه آزمون تیک آبی برای شما کاملاً رایگان خواهد شد.</p>
                    </div>
                  </div>
                </div>

                {/* Celebratory masterclass banner */}
                {has100DaysMasterclass && (
                  <div className="bg-emerald-600 p-5 rounded-[28px] text-white shadow-lg flex items-center justify-between gap-4 animate-fade-in relative overflow-hidden group">
                    <div className="pointer-events-none absolute -right-16 -bottom-16 w-36 h-36 bg-white/5 rounded-full blur-2xl" />
                    <div className="space-y-1 z-10">
                      <div className="flex items-center gap-1.5">
                        <Award className="h-4.5 w-4.5 text-amber-300" />
                        <span className="text-[10px] font-black text-amber-200">آفر فعال جارآموز</span>
                      </div>
                      <h4 className="text-xs font-black text-emerald-50">عضویت مسترکلاس ۱۰۰ روزه عکاسی شناسایی شد.</h4>
                      <p className="text-[9px] text-emerald-100/90 font-semibold">هزینه آزمون شاخه‌های «عکاسی» و «ادیت عکس» به پاس اعتماد شما کاملاً رایگان (۰ تومان) گردید.</p>
                    </div>
                    <span className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-full text-white shrink-0 z-10 border border-white/20">رایگان شد</span>
                  </div>
                )}

                {/* Branches Certification Cards */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-900">انتخاب شاخه و فعالسازی آزمون اصالت:</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Branch 1: Photography */}
                    <div className="p-5 rounded-3xl border border-slate-100 bg-white flex flex-col justify-between min-h-[160px] relative overflow-hidden shadow-sm hover:shadow transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-slate-400">سنجش عملی</span>
                          <h4 className="text-xs font-black text-slate-900">تیک آبی شاخه عکاسی</h4>
                        </div>
                        {examRegisteredBranches.includes("Photography") ? (
                          <span className="flex items-center gap-1 text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                            <BlueBadgeIcon className="h-3.5 w-3.5" />
                            آزمون فعال
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold text-slate-400 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-full">بدون تیک</span>
                        )}
                      </div>

                      <div className="flex justify-between items-center mt-6 border-t border-slate-50 pt-3">
                        <div className="text-xs font-black">
                          {has100DaysMasterclass ? (
                            <div className="flex flex-col">
                              <span className="text-[9px] text-slate-400 line-through font-semibold">۲,۰۰۰,۰۰۰ تومان</span>
                              <span className="text-emerald-600 font-extrabold text-[10px]">رایگان (آفر مسترکلاس)</span>
                            </div>
                          ) : (
                            <span className="text-slate-900">۲,۰۰۰,۰۰۰ تومان</span>
                          )}
                        </div>
                        
                        {!examRegisteredBranches.includes("Photography") && (
                          <button
                            onClick={() => handleRegisterExam("Photography", 2000000)}
                            className="h-8.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-850 text-white text-[10px] font-black transition-all active:scale-95 focus:outline-none"
                          >
                            ثبت‌نام آزمون
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Branch 2: Photo Editing */}
                    <div className="p-5 rounded-3xl border border-slate-100 bg-white flex flex-col justify-between min-h-[160px] relative overflow-hidden shadow-sm hover:shadow transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-slate-400">سنجش عملی</span>
                          <h4 className="text-xs font-black text-slate-900">تیک آبی شاخه ادیت عکس</h4>
                        </div>
                        {examRegisteredBranches.includes("Photo Editing") ? (
                          <span className="flex items-center gap-1 text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                            <BlueBadgeIcon className="h-3.5 w-3.5" />
                            آزمون فعال
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold text-slate-400 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-full">بدون تیک</span>
                        )}
                      </div>

                      <div className="flex justify-between items-center mt-6 border-t border-slate-50 pt-3">
                        <div className="text-xs font-black">
                          {has100DaysMasterclass ? (
                            <div className="flex flex-col">
                              <span className="text-[9px] text-slate-400 line-through font-semibold">۲,۰۰۰,۰۰۰ تومان</span>
                              <span className="text-emerald-600 font-extrabold text-[10px]">رایگان (آفر مسترکلاس)</span>
                            </div>
                          ) : (
                            <span className="text-slate-900">۲,۰۰۰,۰۰۰ تومان</span>
                          )}
                        </div>
                        
                        {!examRegisteredBranches.includes("Photo Editing") && (
                          <button
                            onClick={() => handleRegisterExam("Photo Editing", 2000000)}
                            className="h-8.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-850 text-white text-[10px] font-black transition-all active:scale-95 focus:outline-none"
                          >
                            ثبت‌نام آزمون
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Branch 3: Videography (Soon) */}
                    <div className="p-5 rounded-3xl border border-slate-100 bg-white flex flex-col justify-between min-h-[160px] relative overflow-hidden shadow-sm select-none">
                      <div className="absolute inset-0 bg-slate-50/65 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 text-center">
                        <span className="text-[9px] font-black text-slate-900 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">به‌زودی</span>
                        <span className="text-[8px] text-slate-400 font-semibold mt-1">تیک اصالت این شاخه به‌زودی فعال می‌شود</span>
                      </div>
                      
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-slate-400">سنجش عملی</span>
                          <h4 className="text-xs font-black text-slate-300">تیک آبی شاخه فیلمبرداری</h4>
                        </div>
                      </div>
                    </div>

                    {/* Branch 4: Video Editing (Soon) */}
                    <div className="p-5 rounded-3xl border border-slate-100 bg-white flex flex-col justify-between min-h-[160px] relative overflow-hidden shadow-sm select-none">
                      <div className="absolute inset-0 bg-slate-50/65 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 text-center">
                        <span className="text-[9px] font-black text-slate-900 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">به‌زودی</span>
                        <span className="text-[8px] text-slate-400 font-semibold mt-1">تیک اصالت این شاخه به‌زودی فعال می‌شود</span>
                      </div>
                      
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-slate-400">سنجش عملی</span>
                          <h4 className="text-xs font-black text-slate-300">تیک آبی شاخه ادیت فیلم</h4>
                        </div>
                      </div>
                    </div>

                    {/* Branch 5: Modeling (Soon) */}
                    <div className="p-5 rounded-3xl border border-slate-100 bg-white flex flex-col justify-between min-h-[160px] relative overflow-hidden shadow-sm select-none">
                      <div className="absolute inset-0 bg-slate-50/65 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 text-center">
                        <span className="text-[9px] font-black text-slate-900 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">به‌زودی</span>
                        <span className="text-[8px] text-slate-400 font-semibold mt-1">تیک اصالت این شاخه به‌زودی فعال می‌شود</span>
                      </div>
                      
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-slate-400">سنجش عملی</span>
                          <h4 className="text-xs font-black text-slate-300">تیک آبی شاخه مدلینگ</h4>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Certificate digital placeholder */}
                <div className="p-5 rounded-[32px] border border-slate-150 border-dashed bg-slate-50/50 text-center space-y-4">
                  <span className="text-[9px] font-black text-slate-400 block">مدارک و گواهینامه‌های رسمی پلتفرم</span>
                  
                  <div className="mx-auto max-w-sm p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm text-right space-y-4 relative overflow-hidden">
                    <div className="absolute top-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                      <ShieldCheck className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-[11px] font-black text-slate-900">لوح تقدیر و مدرک اصالت جارآموز</h5>
                      <p className="text-[8px] text-slate-400 font-semibold">اعطا در دو سطح مهارت و ارشد به عکاسان تایید شده</p>
                    </div>
                    <div className="h-1 bg-gradient-to-l from-blue-500 to-transparent w-2/3 rounded-full" />
                    <p className="text-[8px] text-slate-500 font-semibold leading-relaxed">
                      متخصصان پس از قبولی در آزمون عملی، نسخه دیجیتال را روی پروفایل دریافت کرده و نسخه چاپی با مهر برجسته جارآموز برای آن‌ها پست می‌گردد.
                    </p>
                  </div>
                  
                  <p className="text-[10px] text-slate-400 font-semibold">«نمونه لوح تقدیر و مدرک اصالت جارآموز (اعطا در دو سطح مهارت و ارشد)»</p>
                </div>

              </div>
            )}

            {/* 3. Archive Tab */}
            {activeTab === "archive" && (
              <div className="space-y-3">
                {mockArchivedProjects.map((project) => (
                  <div 
                    key={project.id} 
                    className="p-5 rounded-3xl border border-slate-100 bg-white hover:border-slate-200 transition-all duration-200 shadow-sm flex flex-col gap-4 text-right animate-fade-in"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <h4 className="text-sm font-black text-slate-900 leading-normal truncate">
                          {project.title}
                        </h4>
                        <p className="text-[11px] font-semibold text-slate-400">
                          کارفرما: <span className="text-slate-800">{project.client}</span> • دستمزد: <span className="text-slate-800">{project.budget} تومان</span>
                        </p>
                      </div>
                      
                      <span className={`inline-flex shrink-0 px-2.5 py-0.5 rounded-full border text-[9px] font-black ${project.statusColor}`}>
                        {project.statusLabel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-50 pt-3 text-[10px] text-slate-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        تکمیل در: {project.date}
                      </span>
                      <span className="text-slate-400 font-black">پروژه بایگانی شده</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 4. Settings Tab */}
            {activeTab === "settings" && (
              <div className="p-5 rounded-3xl border border-slate-100 bg-white shadow-sm text-right space-y-5 animate-fade-in">
                <h3 className="text-sm font-black text-slate-900">تنظیمات حساب متخصص</h3>
                
                <div>
                  <span className="mb-2 block text-xs font-semibold text-slate-400">
                    شماره موبایل متخصص
                  </span>
                  <div
                    className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-600"
                    dir="ltr"
                  >
                    {user.phoneDisplay}
                  </div>
                  <p className="mt-1.5 text-[9px] font-semibold text-slate-400">
                    شماره موبایل پنل از حساب کاربری خوانده می‌شود و غیرقابل تغییر است.
                  </p>
                </div>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-slate-400">
                    نام نمایشی متخصص / نام استودیو
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setMessage(null);
                    }}
                    placeholder="نام و نام خانوادگی یا استودیو"
                    className={inputClasses}
                  />
                </label>

                {message === "success" && (
                  <p className="flex items-center gap-1.5 text-xs font-black text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    تنظیمات با موفقیت ذخیره شد
                  </p>
                )}
                {message && message !== "success" && (
                  <p className="text-xs font-black text-red-600">{message}</p>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveName}
                    disabled={isPending || !name.trim()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 text-slate-950 px-6 py-2.5 text-xs font-black shadow-sm transition-transform duration-200 hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
