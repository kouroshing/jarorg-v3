import Image from "next/image";
import { MapPin } from "lucide-react";

const MOCK_STUDIOS = [
  {
    id: "1",
    name: "استودیو هارمونی",
    location: "تهران، شهرک غرب",
    coverUrl: "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?q=80&w=800&auto=format&fit=crop"
  },
  {
    id: "2",
    name: "عمارت رویال",
    location: "تهران، لواسان",
    coverUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800&auto=format&fit=crop"
  },
  {
    id: "3",
    name: "آتلیه مینیمال",
    location: "کرج، مهرشهر",
    coverUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=800&auto=format&fit=crop"
  },
  {
    id: "4",
    name: "استودیو نور و سایه",
    location: "تهران، نیاوران",
    coverUrl: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?q=80&w=800&auto=format&fit=crop"
  },
  {
    id: "5",
    name: "لوکیشن دیبا",
    location: "تهران، دیباجی",
    coverUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=800&auto=format&fit=crop"
  }
];

// Double the list to support seamless infinite loop transitions
const CAROUSEL_ITEMS = [...MOCK_STUDIOS, ...MOCK_STUDIOS];

export function TopStudios() {
  return (
    <section className="py-16 sm:py-24 border-t border-slate-100 bg-white overflow-hidden" aria-labelledby="studios-heading">
      
      {/* Inject custom CSS keyframes for infinite marquee scrolling */}
      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(50%);
          }
        }
        .animate-marquee {
          animation: marquee 35s linear infinite;
        }
        .animate-marquee:hover,
        .animate-marquee:active {
          animation-play-state: paused;
        }
      `}</style>

      <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
        {/* Section Header */}
        <div className="mb-10 text-right sm:mb-12">
          <h2
            id="studios-heading"
            className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
          >
            آتلیه‌های برتر جار
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            مجهزترین فضاهای استودیویی برای پروژه‌های شما
          </p>
        </div>
      </div>

      {/* Infinite Scrolling Container */}
      <div className="relative w-full overflow-hidden py-4 flex" dir="ltr">
        {/* Decorative Gradients for Edge Fading */}
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        <div className="flex w-max gap-6 px-3 animate-marquee" dir="rtl">
          {CAROUSEL_ITEMS.map((studio, idx) => (
            <div
              key={`${studio.id}-${idx}`}
              className="group flex w-[80vw] sm:w-[350px] shrink-0 flex-col rounded-[24px] border border-slate-100 bg-white p-3.5 shadow-sm transition-all duration-300 hover:border-slate-200 hover:shadow-lg cursor-pointer"
            >
              {/* Studio Cover Photo */}
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[18px] bg-slate-50">
                <Image
                  src={studio.coverUrl}
                  alt={studio.name}
                  fill
                  sizes="(max-width: 640px) 80vw, 350px"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-103"
                />
              </div>

              {/* Info Details */}
              <div className="mt-4 text-right px-1">
                <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#006097] transition-colors duration-300 ease-out">
                  {studio.name}
                </h3>
                <p className="mt-1 text-[11px] font-semibold text-slate-400 flex items-center justify-end gap-1">
                  {studio.location}
                  <MapPin className="h-3 w-3 text-slate-350 shrink-0" />
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
