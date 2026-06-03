"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  MapPin,
  User,
  Phone,
  Calendar,
  ChevronDown,
  Link,
  type LucideIcon,
} from "lucide-react";
import { ProjectSuccessScreen } from "@/app/create-project/ProjectSuccessScreen";
import { submitProjectRequest } from "@/app/actions/projectActions";
import {
  AUDIENCE_LABELS,
  getOfferingById,
  getOfferingsForAudience,
  getStep2TitleForOffering,
  type ServiceAudience,
} from "@/lib/projects/service-offerings";
import { getSessionContactForForm } from "@/app/actions/authActions";
import { InlineOtpAuth } from "@/components/create-project/InlineOtpAuth";
import {
  DEFAULT_PROJECT_BUDGET,
  PROJECT_BUDGET_OPTIONS,
  type ProjectBudgetId,
} from "@/lib/projects/budget";
type CallTime = "morning" | "noon" | "evening";
type CityId = "tehran" | "karaj" | "other";

type FormState = {
  city: CityId;
  serviceAudience: ServiceAudience;
  serviceOfferingId: string | null;
  briefNotes: string;
  referenceLink: string;
  budget: ProjectBudgetId;
  expertId: string | null;
  name: string;
  phone: string;
  callTime: CallTime;
};

const CITY_IDS: CityId[] = ["tehran", "karaj", "other"];

const CITIES: { id: CityId; label: string }[] = [
  { id: "tehran", label: "تهران" },
  { id: "karaj", label: "کرج" },
  { id: "other", label: "سایر" },
];

const STEPS = ["انتخاب خدمات", "بریف پروژه", "تایید و ثبت"] as const;
const TOTAL_STEPS = STEPS.length;

const BRIEF_REQUIRED_MESSAGE =
  "لطفاً جزئیات یا نیازمندی‌های پروژه خود را بنویسید.";

const CALL_TIME_LABELS: Record<CallTime, string> = {
  morning: "صبح (۹–۱۲)",
  noon: "ظهر (۱۲–۱۵)",
  evening: "عصر (۱۵–۲۰)",
};

function StepPanel({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-step">{children}</div>;
}

function CreateProjectPageContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [phoneLocked, setPhoneLocked] = useState(false);
  const [form, setForm] = useState<FormState>({
    city: "tehran",
    serviceAudience: "commercial",
    serviceOfferingId: null,
    briefNotes: "",
    referenceLink: "",
    budget: DEFAULT_PROJECT_BUDGET,
    expertId: null,
    name: "",
    phone: "",
    callTime: "morning",
  });

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedBudget, setSubmittedBudget] = useState<ProjectBudgetId>(
    DEFAULT_PROJECT_BUDGET
  );
  const [briefError, setBriefError] = useState<string | null>(null);

  useEffect(() => {
    const expertId = searchParams.get("expertId");
    const cityParam = searchParams.get("city");
    const query = searchParams.get("q");

    setForm((prev) => ({
      ...prev,
      ...(expertId ? { expertId } : {}),
      ...(cityParam && CITY_IDS.includes(cityParam as CityId)
        ? { city: cityParam as CityId }
        : {}),
      ...(query?.trim() ? { briefNotes: query.trim() } : {}),
    }));
  }, [searchParams]);

  const refreshSession = useCallback(async () => {
    const session = await getSessionContactForForm();
    setIsAuthenticated(session.isAuthenticated);
    setPhoneLocked(session.phoneLocked);
    if (session.phone) {
      setForm((prev) => ({ ...prev, phone: session.phone! }));
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const selectedOffering = getOfferingById(form.serviceOfferingId);

  const canProceed = (() => {
    switch (step) {
      case 0:
        return form.serviceOfferingId !== null;
      case 1:
        return form.briefNotes.trim().length > 0;
      case 2:
        return form.name.trim().length > 0;
      default:
        return true;
    }
  })();

  const isLastStep = step === TOTAL_STEPS - 1;
  const showFooterSubmit = isLastStep && isAuthenticated;

  const submitProject = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const offering = getOfferingById(form.serviceOfferingId);
      if (!offering) {
        setError("لطفاً نوع خدمت را انتخاب کنید.");
        return;
      }

      const result = await submitProjectRequest({
        serviceAudience: form.serviceAudience,
        serviceOfferingId: form.serviceOfferingId!,
        city: form.city,
        briefNotes: form.briefNotes,
        referenceLink: form.referenceLink.trim() || undefined,
        name: form.name,
        phone: form.phone,
        callTime: form.callTime,
        budget: form.budget,
        expertId: form.expertId ?? undefined,
      });

      if (result.success) {
        setSubmittedBudget(form.budget);
        setSubmitted(true);
      } else {
        setError(result.error);
      }
    });
  }, [form]);

  const handleGuestVerified = useCallback(async () => {
    if (!form.name.trim()) {
      setError("لطفاً نام خود را وارد کنید.");
      return;
    }
    await refreshSession();
    submitProject();
  }, [form.name, refreshSession, submitProject]);

  const goNext = () => {
    if (isLastStep) {
      if (isAuthenticated) {
        submitProject();
      }
      return;
    }
    if (step === 1 && form.briefNotes.trim().length === 0) {
      setBriefError(BRIEF_REQUIRED_MESSAGE);
      return;
    }
    setBriefError(null);
    if (canProceed) setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  if (submitted) {
    return <ProjectSuccessScreen budget={submittedBudget} />;
  }

  return (
    <div className="relative mx-auto flex w-full max-w-2xl flex-col pb-28">
      {form.expertId && (
        <p className="mb-4 rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-center text-xs font-medium text-gray-600">
          درخواست شما برای متخصص منتخب جار ثبت می‌شود.
        </p>
      )}

      {/* Step toolbar */}
      <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
        <p className="text-sm font-semibold text-black">
          مرحله {step + 1} از {TOTAL_STEPS}
          <span className="mr-2 font-normal text-gray-400">·</span>
          <span className="font-normal text-gray-500">
            {step === 1
              ? getStep2TitleForOffering(selectedOffering)
              : STEPS[step]}
          </span>
        </p>

        <div className="relative shrink-0">
          <MapPin
            className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <ChevronDown
            className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <select
            value={form.city}
            onChange={(e) => update("city", e.target.value as CityId)}
            aria-label="انتخاب شهر"
            className="appearance-none rounded-xl border border-gray-100 bg-gray-50 py-2 pl-7 pr-8 text-xs font-medium text-black outline-none transition-all duration-200 focus:ring-2 focus:ring-[#FACC15]"
          >
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Progress */}
      <div
        className="mb-8 flex gap-1.5"
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-label={`پیشرفت فرم، مرحله ${step + 1} از ${TOTAL_STEPS}`}
      >
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-0.5 flex-1 rounded-full transition-all duration-500 ease-out ${
              i <= step ? "bg-[#FACC15]" : "bg-gray-100"
            }`}
          />
        ))}
      </div>

      <div key={step} className="min-h-[280px]">
        <StepPanel>
          {step === 0 && (
            <StepServiceSelection
              audience={form.serviceAudience}
              selectedOfferingId={form.serviceOfferingId}
              onAudienceChange={(audience) => {
                setForm((prev) => ({
                  ...prev,
                  serviceAudience: audience,
                  serviceOfferingId: null,
                  briefNotes: "",
                  referenceLink: "",
                }));
              }}
              onSelectOffering={(id) => {
                setForm((prev) => ({
                  ...prev,
                  serviceOfferingId: id,
                  briefNotes: "",
                  referenceLink: "",
                }));
              }}
            />
          )}

          {step === 1 && (
            <StepBriefDetails
              offering={selectedOffering}
              briefNotes={form.briefNotes}
              referenceLink={form.referenceLink}
              briefError={briefError}
              budget={form.budget}
              onBriefNotesChange={(v) => {
                setBriefError(null);
                update("briefNotes", v);
              }}
              onReferenceLinkChange={(v) => update("referenceLink", v)}
              onBudgetChange={(id) => update("budget", id)}
            />
          )}

          {step === 2 && (
            <StepFinalize
              form={form}
              isAuthenticated={isAuthenticated}
              phoneLocked={phoneLocked}
              update={update}
              onGuestVerified={handleGuestVerified}
              isSubmitting={isPending}
            />
          )}
        </StepPanel>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600"
        >
          {error}
        </p>
      )}

      {/* Sticky bottom navigation */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-gray-100 bg-white/90 px-5 py-3 backdrop-blur-md md:bottom-0 md:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0 || isPending}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowRight className="h-4 w-4" />
            قبلی
          </button>

          <button
            type="button"
            onClick={goNext}
            disabled={
              isLastStep
                ? !showFooterSubmit || isPending
                : !canProceed || isPending
            }
            aria-busy={isPending}
            className={`inline-flex min-h-11 flex-1 max-w-[12rem] items-center justify-center gap-2 rounded-full bg-[#FACC15] px-6 text-sm font-bold text-black shadow-glow transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100 sm:max-w-none sm:flex-initial sm:px-8 ${
              isLastStep && !showFooterSubmit ? "invisible pointer-events-none" : ""
            }`}
          >
            {isPending && showFooterSubmit ? (
              <>
                در حال پردازش...
                <Loader2 className="h-4 w-4 animate-spin" />
              </>
            ) : showFooterSubmit ? (
              <>
                ثبت نهایی پروژه
                <Check className="h-4 w-4" strokeWidth={2.5} />
              </>
            ) : !isLastStep ? (
              <>
                مرحله بعد
                <ArrowLeft className="h-4 w-4" />
              </>
            ) : null}
          </button>
        </div>
      </div>
    </div>
  );
}

const NOTES_FIELD_CLASS =
  "w-full rounded-2xl border-none bg-gray-50/50 text-sm text-black placeholder:text-gray-400 outline-none transition-all duration-200 focus:bg-gray-50 focus:ring-2 focus:ring-[#FACC15]";

const NOTES_TEXTAREA_CLASS = `${NOTES_FIELD_CLASS} min-h-[140px] resize-none px-4 py-4 leading-7`;

function BudgetRangePicker({
  value,
  onChange,
}: {
  value: ProjectBudgetId;
  onChange: (id: ProjectBudgetId) => void;
}) {
  return (
    <section className="pt-2">
      <p className="mb-3 text-xs font-medium text-gray-500">
        محدوده بودجه در نظر گرفته شده
      </p>
      <div
        className="grid grid-cols-2 gap-2.5"
        role="radiogroup"
        aria-label="محدوده بودجه"
      >
        {PROJECT_BUDGET_OPTIONS.map((option) => {
          const active = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.id)}
              className={`rounded-xl border px-3 py-3 text-right text-xs font-medium leading-snug transition-all duration-200 active:scale-[0.98] ${
                active
                  ? "border-[#FACC15] bg-yellow-50/50 text-gray-900"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StepBriefDetails({
  offering,
  briefNotes,
  referenceLink,
  briefError,
  budget,
  onBriefNotesChange,
  onReferenceLinkChange,
  onBudgetChange,
}: {
  offering: ReturnType<typeof getOfferingById>;
  briefNotes: string;
  referenceLink: string;
  briefError: string | null;
  budget: ProjectBudgetId;
  onBriefNotesChange: (value: string) => void;
  onReferenceLinkChange: (value: string) => void;
  onBudgetChange: (id: ProjectBudgetId) => void;
}) {
  const title = getStep2TitleForOffering(offering);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-black">{title}</h2>
        <p className="mt-1 text-xs text-gray-500">
          جزئیات پروژه و بودجه تقریبی را مشخص کنید.
        </p>
      </div>

      <section>
        <p className="mb-3 text-sm font-medium text-black">
          توضیحات تکمیلی
          <span className="mr-1 text-red-500" aria-hidden>
            *
          </span>
        </p>
        <textarea
          value={briefNotes}
          onChange={(e) => onBriefNotesChange(e.target.value)}
          placeholder="ایده، سبک، زمان‌بندی و هر نیازمندی که برای تیم مهم است..."
          rows={6}
          required
          autoFocus
          aria-invalid={!!briefError}
          aria-describedby={briefError ? "brief-notes-error" : undefined}
          className={NOTES_TEXTAREA_CLASS}
        />
        {briefError && (
          <p
            id="brief-notes-error"
            role="alert"
            className="mt-2 text-xs text-red-600"
          >
            {briefError}
          </p>
        )}
      </section>

      <section>
        <p className="mb-3 text-sm font-medium text-black">
          لینک نمونه کار مشابه یا مودبرد (اختیاری)
        </p>
        <div className="relative">
          <Link
            className="pointer-events-none absolute right-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400"
            strokeWidth={1.75}
            aria-hidden
          />
          <input
            type="url"
            dir="ltr"
            value={referenceLink}
            onChange={(e) => onReferenceLinkChange(e.target.value)}
            placeholder="مثلاً لینک پینترست، اینستاگرام یا یک سایت نمونه..."
            className={`${NOTES_FIELD_CLASS} py-3.5 pl-4 pr-11 text-left placeholder:text-right`}
          />
        </div>
      </section>

      <BudgetRangePicker value={budget} onChange={onBudgetChange} />
    </div>
  );
}

function StepServiceSelection({
  audience,
  selectedOfferingId,
  onAudienceChange,
  onSelectOffering,
}: {
  audience: ServiceAudience;
  selectedOfferingId: string | null;
  onAudienceChange: (audience: ServiceAudience) => void;
  onSelectOffering: (id: string) => void;
}) {
  const offerings = getOfferingsForAudience(audience);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-black">
          نوع خدمت را انتخاب کنید
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          دسته و خدمت مورد نظر خود را مشخص کنید.
        </p>
      </div>

      <div
        className="flex rounded-xl bg-gray-100 p-1"
        role="tablist"
        aria-label="دسته خدمات"
      >
        {(["commercial", "personal"] as const).map((key) => {
          const active = audience === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onAudienceChange(key)}
              className={`flex-1 rounded-[10px] px-2 py-2.5 text-center text-xs font-semibold transition-all duration-200 sm:text-sm ${
                active
                  ? "bg-white text-black shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {AUDIENCE_LABELS[key]}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {offerings.map((offering) => {
          const Icon = offering.icon;
          const active = selectedOfferingId === offering.id;
          return (
            <button
              key={offering.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelectOffering(offering.id)}
              className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 text-right transition-all duration-200 active:scale-[0.98] ${
                active
                  ? "border-[#FACC15] bg-yellow-50/50"
                  : "border-gray-100 hover:border-gray-200"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  active ? "text-black" : "text-gray-500"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-black">
                {offering.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IconInput({
  icon: Icon,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: LucideIcon;
}) {
  return (
    <div className="relative">
      <Icon
        className="pointer-events-none absolute right-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400"
        strokeWidth={1.75}
        aria-hidden
      />
      <input
        {...props}
        className={`w-full rounded-2xl border border-gray-100 bg-gray-50/90 py-3.5 pr-11 pl-4 text-sm text-black placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-transparent focus:bg-gray-50 focus:ring-2 focus:ring-[#FACC15] ${className}`}
      />
    </div>
  );
}

function StepFinalize({
  form,
  isAuthenticated,
  phoneLocked,
  update,
  onGuestVerified,
  isSubmitting,
}: {
  form: FormState;
  isAuthenticated: boolean;
  phoneLocked: boolean;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onGuestVerified: () => void | Promise<void>;
  isSubmitting: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-black">
          تایید و ثبت
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          {isAuthenticated
            ? "اطلاعات تماس را بررسی کنید و درخواست را ثبت کنید."
            : "اطلاعات تماس را وارد کنید و شماره موبایل خود را تأیید کنید."}
        </p>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-black">
          نام و نام خانوادگی
        </span>
        <IconInput
          icon={User}
          type="text"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="نام کامل"
          autoFocus
          disabled={isSubmitting}
        />
      </label>

      {isAuthenticated && (
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-black">
            شماره تماس
          </span>
          <span className="mb-2 block text-xs text-gray-500">
            شماره از حساب کاربری شما ثبت می‌شود.
          </span>
          <IconInput
            icon={Phone}
            type="tel"
            inputMode="tel"
            dir="ltr"
            value={form.phone}
            readOnly={phoneLocked}
            placeholder="09123456789"
            aria-readonly
            className="cursor-not-allowed bg-gray-100 text-left text-gray-600 placeholder:text-left"
          />
        </label>
      )}

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-black">
          بهترین زمان تماس
        </span>
        <div className="relative">
          <Calendar
            className="pointer-events-none absolute right-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400"
            strokeWidth={1.75}
            aria-hidden
          />
          <ChevronDown
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <select
            value={form.callTime}
            onChange={(e) => update("callTime", e.target.value as CallTime)}
            disabled={isSubmitting}
            className="w-full appearance-none rounded-2xl border border-gray-100 bg-gray-50/90 py-3.5 pr-11 pl-10 text-sm text-black outline-none transition-all duration-200 focus:bg-gray-50 focus:ring-2 focus:ring-[#FACC15] disabled:opacity-60"
          >
            {(Object.keys(CALL_TIME_LABELS) as CallTime[]).map((key) => (
              <option key={key} value={key}>
                {CALL_TIME_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </label>

      {!isAuthenticated && (
        <InlineOtpAuth
          phone={form.phone}
          onPhoneChange={(phone) => update("phone", phone)}
          onVerified={onGuestVerified}
          disabled={isSubmitting || form.name.trim().length === 0}
        />
      )}
    </div>
  );
}

export default function CreateProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[40dvh] w-full max-w-2xl items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      }
    >
      <CreateProjectPageContent />
    </Suspense>
  );
}
