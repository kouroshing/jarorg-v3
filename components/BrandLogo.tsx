import Image from "next/image";
import Link from "next/link";

const LOGO_SRC = "/logo.svg";
const LOGO_ALT = "لوگوی پلتفرم جار";

type BrandLogoProps = {
  variant?: "header" | "footer";
  linked?: boolean;
  /** Show "جار" wordmark next to the mark (top bar). */
  showWordmark?: boolean;
  className?: string;
};

export function BrandLogo({
  variant = "header",
  linked = true,
  showWordmark = false,
  className = "",
}: BrandLogoProps) {
  const isFooter = variant === "footer";

  const mark = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 701 701"
      preserveAspectRatio="xMidYMid meet"
      className={`shrink-0 fill-current h-8 w-auto text-jar-logo ${className}`.trim()}
      aria-label={LOGO_ALT}
      role="img"
    >
      <path d="M1548,1006a77.61,77.61,0,0,1-14.12,44.76h0A78,78,0,1,1,1548,1006Z" transform="translate(-847.5 -900.5)"/>
      <path d="M1548.5,1182.5v187.64c0,127.78-103.58,231.36-231.36,231.36H1078.86c-127.78,0-231.36-103.58-231.36-231.36V1131.86c0-127.78,103.58-231.36,231.36-231.36H1272v132H1077.36a99.86,99.86,0,0,0-99.86,99.86v236.28a99.86,99.86,0,0,0,99.86,99.86h236.28a99.86,99.86,0,0,0,99.86-99.86V1182.5Z" transform="translate(-847.5 -900.5)"/>
    </svg>
  );

  const content = showWordmark ? (
    <span className="inline-flex items-center gap-2">
      {mark}
      <span className={`text-sm sm:text-base font-black tracking-tight ${isFooter ? "text-white" : "text-jar-primary"}`}>
        جار
      </span>
    </span>
  ) : (
    mark
  );

  if (!linked) {
    return <span className="inline-flex shrink-0">{content}</span>;
  }

  return (
    <Link
      href="/"
      className="inline-flex shrink-0 transition-opacity duration-200 hover:opacity-85"
      aria-label="جار — صفحه اصلی"
    >
      {content}
    </Link>
  );
}

export default BrandLogo;
