import type { Metadata } from "next";
import { ComprehensiveLegalDoc } from "@/components/legal/ComprehensiveLegalDoc";

export const metadata: Metadata = {
  title: "سیاست حفظ حریم خصوصی و محرمانگی (NDA) | جار",
  description:
    "سند جامع شرایط، قوانین استفاده، سیاست حفظ حریم خصوصی و محرمانگی دیجیتال پلتفرم هوشمند خدمات بصری جار",
};

export default function PrivacyPage() {
  return <ComprehensiveLegalDoc initialFocus="privacy" />;
}
