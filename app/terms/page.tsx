import type { Metadata } from "next";
import { ComprehensiveLegalDoc } from "@/components/legal/ComprehensiveLegalDoc";

export const metadata: Metadata = {
  title: "شرایط، قوانین استفاده و حریم خصوصی | جار",
  description:
    "سند جامع شرایط، قوانین استفاده، نظام مالی، بیعانه، تایید دوطرفه و حل اختلاف پلتفرم هوشمند خدمات بصری جار",
};

export default function TermsPage() {
  return <ComprehensiveLegalDoc initialFocus="terms" />;
}
