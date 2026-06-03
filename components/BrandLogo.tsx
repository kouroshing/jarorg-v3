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
    <Image
      src={LOGO_SRC}
      alt={LOGO_ALT}
      width={isFooter ? 52 : 32}
      height={isFooter ? 40 : 28}
      priority={variant === "header" && !isFooter}
      className={`shrink-0 object-contain ${
        isFooter ? "h-10 w-auto opacity-80 grayscale" : "h-7 w-auto md:h-8"
      } ${className}`.trim()}
    />
  );

  const content = showWordmark ? (
    <span className="inline-flex items-center gap-2">
      {mark}
      <span className="text-base font-extrabold tracking-tight text-black md:text-lg">
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
