import Image from "next/image";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { getActiveExperts } from "@/app/actions/expertActions";
import type { PublicExpertRecord } from "@/app/actions/expertActions";

function ExpertAvatar({ expert }: { expert: PublicExpertRecord }) {
  const className =
    "h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gray-100 ring-2 ring-white";

  if (expert.imageUrl.startsWith("/")) {
    return (
      <div className={`relative ${className}`}>
        <Image
          src={expert.imageUrl}
          alt=""
          fill
          className="object-cover"
          sizes="56px"
        />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={expert.imageUrl}
      alt=""
      className={`${className} object-cover`}
      referrerPolicy="no-referrer"
    />
  );
}

export async function TopExperts() {
  const experts = await getActiveExperts();

  if (experts.length === 0) {
    return null;
  }

  return (
    <section className="py-16 sm:py-24" aria-labelledby="experts-heading">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="mb-8 text-right sm:mb-10">
          <h2
            id="experts-heading"
            className="text-2xl font-extrabold tracking-tight text-black sm:text-3xl"
          >
            منتخبان جار
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            متخصصانی که کیفیت را در اولویت قرار می‌دهند.
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gray-100 bg-white/90 px-2.5 py-1 text-[10px] font-medium leading-snug text-gray-500 shadow-sm">
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-600" strokeWidth={2.25} />
            دارای گواهینامه تایید صلاحیت از آکادمی جارآموز
          </p>
        </div>
      </div>

      <div
        className="flex gap-4 overflow-x-auto pb-4 pl-5 pr-5 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-5 sm:pl-[max(1.25rem,calc((100vw-64rem)/2+2rem))] sm:pr-8 [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {experts.map((expert) => (
          <article
            key={expert.id}
            className="flex w-[min(85vw,280px)] shrink-0 scroll-ml-4 scroll-mr-4 flex-col rounded-3xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:border-gray-200 hover:shadow-md sm:w-[300px]"
            style={{ scrollSnapAlign: "start" }}
          >
            <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full border border-gray-100 bg-white/90 px-2 py-0.5 text-[10px] font-medium leading-snug text-gray-500">
              <BadgeCheck className="h-3 w-3 shrink-0 text-sky-600" strokeWidth={2.25} />
              تایید صلاحیت جارآموز
            </span>

            <div className="flex items-center gap-3">
              <ExpertAvatar expert={expert} />
              <div className="min-w-0 flex-1 text-right">
                <h3 className="truncate text-base font-bold text-black">
                  {expert.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">
                  {expert.description}
                </p>
              </div>
            </div>

            <Link
              href={`/create-project?expertId=${expert.id}`}
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-black py-3 text-xs font-bold text-white transition-all duration-200 hover:bg-gray-900 active:scale-[0.98]"
            >
              رزرو با این متخصص
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
