/**
 * Seed curated free Jar Location spots into the local/production SQLite DB.
 * Idempotent: skips existing slugs.
 *
 *   node scripts/seed-free-jar-locations.mjs
 */
const { PrismaClient } = require("@prisma/client");
const path = require("path");

const MOOD = {
  OPEN_SPACE: "/images/jar-locations/open-space.jpg",
  MANSION_GARDEN: "/images/jar-locations/mansion.jpg",
  STREET: "/images/jar-locations/street.jpg",
  STUDIO: "/images/jar-locations/studio.jpg",
  HISTORIC: "/images/jar-locations/historic.jpg",
  DECOR: "/images/jar-locations/decor.jpg",
  OTHER: "/images/jar-locations/other.jpg",
};

const PARK = [
  "family",
  "kids",
  "couple-anniversary",
  "portrait-avatar",
  "pregnancy",
  "wedding-ceremony",
  "personal-other",
];
const STREET = [
  "modeling",
  "portrait-avatar",
  "couple-anniversary",
  "instagram-reels-video",
  "personal-other",
];
const HISTORIC = [
  "architecture-interior",
  "modeling",
  "wedding-ceremony",
  "couple-anniversary",
  "portrait-avatar",
];

/** Keep in sync with lib/locations/freeLocationSeed.ts */
const SEED = [
  {
    slug: "seed-jamshidieh",
    name: "پارک جمشیدیه",
    description:
      "پارک سنگی دامنهٔ کوه‌های شمال تهران؛ مسیر پیاده، درخت و سنگ‌چین. معمولاً ورودی ندارد. برای دوربین حرفه‌ای در رویداد شلوغ ممکن است هماهنگی شهرداری لازم باشد.",
    category: "OPEN_SPACE",
    lat: 35.8215,
    lng: 51.4268,
    city: "تهران",
    district: "نیاوران",
    address: "انتهای خیابان امیدوار، پارک جمشیدیه",
    needsPermit: false,
    hasParking: true,
    securityLevel: "MEDIUM",
    suitableFor: PARK,
  },
  {
    slug: "seed-mellat",
    name: "پارک ملت",
    description:
      "پارک بزرگ ونک با مسیرهای عریض، دریاچه و فضای سبز. ورود عمومی رایگان است. نور طلایی عصر برای پرتره و خانواده مناسب است.",
    category: "OPEN_SPACE",
    lat: 35.7786,
    lng: 51.4119,
    city: "تهران",
    district: "ونک",
    address: "بزرگراه شهید حقانی، پارک ملت",
    needsPermit: false,
    hasParking: true,
    securityLevel: "MEDIUM",
    suitableFor: PARK,
  },
  {
    slug: "seed-laleh",
    name: "پارک لاله",
    description:
      "پارک مرکزی تهران کنار موزه هنرهای معاصر. چمن، مسیر دوچرخه و سایهٔ درختان. ورود رایگان.",
    category: "OPEN_SPACE",
    lat: 35.7158,
    lng: 51.3925,
    city: "تهران",
    district: "امیرآباد",
    address: "خیابان کارگر شمالی، پارک لاله",
    needsPermit: false,
    hasParking: true,
    securityLevel: "MEDIUM",
    suitableFor: PARK,
  },
  {
    slug: "seed-saei",
    name: "پارک ساعی",
    description:
      "پارک خطی ولیعصر با درختان بلند و مسیر پیاده. مناسب پرترهٔ شهری و فرمالیتهٔ سبک. ورود رایگان.",
    category: "OPEN_SPACE",
    lat: 35.7365,
    lng: 51.4118,
    city: "تهران",
    district: "ولیعصر",
    address: "خیابان ولیعصر، پارک ساعی",
    needsPermit: false,
    hasParking: false,
    securityLevel: "MEDIUM",
    suitableFor: PARK,
  },
  {
    slug: "seed-qeytarieh",
    name: "پارک قیطریه",
    description:
      "پارک محله‌ای شمال تهران با چمن و مسیر پیاده. فضای آرام برای خانواده و کودک. ورود رایگان.",
    category: "OPEN_SPACE",
    lat: 35.7917,
    lng: 51.4445,
    city: "تهران",
    district: "قیطریه",
    address: "خیابان قیطریه، پارک قیطریه",
    needsPermit: false,
    hasParking: true,
    securityLevel: "MEDIUM",
    suitableFor: PARK,
  },
  {
    slug: "seed-ab-o-atash",
    name: "بوستان آب‌وآتش",
    description:
      "فضای باز عباس‌آباد با فواره‌ها و مسیر چوبی. ورود عمومی معمولاً رایگان است. برای تولید محتوای شلوغ بهتر است صبح زود بروید.",
    category: "OPEN_SPACE",
    lat: 35.7553,
    lng: 51.4187,
    city: "تهران",
    district: "عباس‌آباد",
    address: "بزرگراه حقانی، بوستان آب‌وآتش",
    needsPermit: false,
    hasParking: true,
    securityLevel: "MEDIUM",
    suitableFor: [...PARK, "instagram-reels-video"],
  },
  {
    slug: "seed-tabiat-bridge",
    name: "پل طبیعت",
    description:
      "پل پیاده بین بوستان‌های طالقانی و آب‌وآتش. عبور عمومی رایگان است. عکاسی تبلیغاتی گسترده ممکن است نیاز به مجوز مجموعه داشته باشد.",
    category: "OPEN_SPACE",
    lat: 35.7547,
    lng: 51.3863,
    city: "تهران",
    district: "عباس‌آباد",
    address: "پل طبیعت، اتصال طالقانی و آب‌وآتش",
    needsPermit: true,
    hasParking: true,
    securityLevel: "MEDIUM",
    suitableFor: [...STREET, "architecture-interior", "couple-anniversary"],
  },
  {
    slug: "seed-darband",
    name: "دربند — مسیر پیاده",
    description:
      "مسیر کوهپایه و رستوران‌های روباز شمال تهران. فضای عمومی است و ورودی پارک ندارد. برای فرمالیتهٔ شلوغ آخر هفته شلوغ می‌شود.",
    category: "STREET",
    lat: 35.8194,
    lng: 51.426,
    city: "تهران",
    district: "دربند",
    address: "میدان دربند، ابتدای مسیر پیاده",
    needsPermit: false,
    hasParking: false,
    securityLevel: "MEDIUM",
    suitableFor: STREET,
  },
  {
    slug: "seed-darakeh",
    name: "درکه — مسیر رودخانه",
    description:
      "مسیر دره و رودخانه در شمال‌غرب تهران. فضای عمومی رایگان برای عکاسی طبیعت و زوج.",
    category: "OPEN_SPACE",
    lat: 35.8078,
    lng: 51.3806,
    city: "تهران",
    district: "درکه",
    address: "محله درکه، ابتدای مسیر کوهنوردی",
    needsPermit: false,
    hasParking: false,
    securityLevel: "MEDIUM",
    suitableFor: PARK,
  },
  {
    slug: "seed-tajrish",
    name: "میدان و بازار تجریش",
    description:
      "بافت بازار سنتی و میدان تجریش. فضای عمومی شهری. داخل حجره‌ها متعلق به کسبه است؛ نمای گذر و میدان معمولاً بدون ورودی است.",
    category: "STREET",
    lat: 35.8044,
    lng: 51.4304,
    city: "تهران",
    district: "تجریش",
    address: "میدان تجریش",
    needsPermit: false,
    hasParking: false,
    securityLevel: "MEDIUM",
    suitableFor: STREET,
  },
  {
    slug: "seed-30tir",
    name: "خیابان سی‌تیر",
    description:
      "خیابان تاریخی مرکز تهران با کافه و نمای قدیمی. فضای عمومی پیاده‌راه. مناسب استریت و محتوا.",
    category: "STREET",
    lat: 35.6936,
    lng: 51.4128,
    city: "تهران",
    district: "سی‌تیر",
    address: "خیابان سی‌تیر، حدفاصل جمهوری و امام خمینی",
    needsPermit: false,
    hasParking: false,
    securityLevel: "MEDIUM",
    suitableFor: STREET,
  },
  {
    slug: "seed-hassanabad",
    name: "میدان حسن‌آباد",
    description:
      "میدان تاریخی با قوس‌های آجری. فضای عمومی شهری. برای معماری و پرترهٔ شهری مناسب است.",
    category: "HISTORIC",
    lat: 35.6869,
    lng: 51.4104,
    city: "تهران",
    district: "حسن‌آباد",
    address: "میدان حسن‌آباد",
    needsPermit: false,
    hasParking: false,
    securityLevel: "MEDIUM",
    suitableFor: HISTORIC,
  },
  {
    slug: "seed-iran-artists",
    name: "خانه هنرمندان — پارک ایرانشهر",
    description:
      "باغ و مسیرهای پارک ایرانشهر اطراف خانه هنرمندان. ورود به محوطهٔ پارک معمولاً رایگان است. گالری‌های داخل مجموعه ممکن است برنامهٔ جدا داشته باشند.",
    category: "OPEN_SPACE",
    lat: 35.7056,
    lng: 51.4097,
    city: "تهران",
    district: "ایرانشهر",
    address: "خیابان ایرانشهر، پارک هنرمندان",
    needsPermit: false,
    hasParking: true,
    securityLevel: "MEDIUM",
    suitableFor: [...PARK, "architecture-interior"],
  },
  {
    slug: "seed-chitgar",
    name: "پارک جنگلی چیتگر",
    description:
      "فضای جنگلی غرب تهران. ورود به محدوده‌های عمومی پارک معمولاً رایگان است؛ برخی مجموعه‌های داخل محوطه ورودی جدا دارند.",
    category: "OPEN_SPACE",
    lat: 35.729,
    lng: 51.209,
    city: "تهران",
    district: "چیتگر",
    address: "اتوبان تهران–کرج، پارک جنگلی چیتگر",
    needsPermit: false,
    hasParking: true,
    securityLevel: "MEDIUM",
    suitableFor: PARK,
  },
  {
    slug: "seed-naqshe-jahan",
    name: "میدان نقش جهان",
    description:
      "میدان عمومی تاریخی اصفهان. عبور و عکاسی در خود میدان رایگان است. ورود به بناهای اطراف (مسجد، عالی‌قاپو) جدا و معمولاً پولی است.",
    category: "HISTORIC",
    lat: 32.6577,
    lng: 51.6776,
    city: "اصفهان",
    district: "نقش جهان",
    address: "میدان امام، نقش جهان",
    needsPermit: false,
    hasParking: false,
    securityLevel: "MEDIUM",
    suitableFor: HISTORIC,
  },
  {
    slug: "seed-sioseh-pol",
    name: "سی‌وسه‌پل",
    description:
      "پل تاریخی روی زاینده‌رود. فضای عمومی است و عبور از روی پل ورودی ندارد.",
    category: "HISTORIC",
    lat: 32.6447,
    lng: 51.6675,
    city: "اصفهان",
    district: "سی‌وسه‌پل",
    address: "خیابان چهارباغ عباسی، سی‌وسه‌پل",
    needsPermit: false,
    hasParking: false,
    securityLevel: "MEDIUM",
    suitableFor: HISTORIC,
  },
  {
    slug: "seed-shiraz-zand",
    name: "خیابان زند — اطراف ارگ",
    description:
      "بافت خیابان زند شیراز کنار ارگ کریم‌خان. خود خیابان و پیاده‌رو عمومی و رایگان است. ورود به داخل ارگ جدا و پولی است.",
    category: "STREET",
    lat: 29.6178,
    lng: 52.544,
    city: "شیراز",
    district: "زند",
    address: "خیابان زند، مقابل ارگ کریم‌خان",
    needsPermit: false,
    hasParking: false,
    securityLevel: "MEDIUM",
    suitableFor: STREET,
  },
  {
    slug: "seed-rasht-municipality",
    name: "میدان شهرداری رشت",
    description:
      "میدان تاریخی شهرداری رشت با نمای اروپایی و پیاده‌راه. فضای عمومی شهری، بدون ورودی.",
    category: "STREET",
    lat: 37.2735,
    lng: 49.585,
    city: "رشت",
    district: "مرکز شهر",
    address: "میدان شهرداری رشت",
    needsPermit: false,
    hasParking: false,
    securityLevel: "MEDIUM",
    suitableFor: STREET,
  },
  {
    slug: "seed-elgoli",
    name: "ائل‌گلی تبریز — محوطهٔ عمومی",
    description:
      "پارک و دریاچهٔ ائل‌گلی. گردش در محوطهٔ عمومی معمولاً رایگان است. عمارت وسط استخر ممکن است محدودیت جدا داشته باشد.",
    category: "OPEN_SPACE",
    lat: 37.511,
    lng: 46.366,
    city: "تبریز",
    district: "ائل‌گلی",
    address: "ائل‌گلی، پارک شاه‌گلی",
    needsPermit: false,
    hasParking: true,
    securityLevel: "MEDIUM",
    suitableFor: PARK,
  },
  {
    slug: "seed-vakilabad",
    name: "پارک وکیل‌آباد مشهد",
    description:
      "پارک جنگلی غرب مشهد. ورود به محدوده‌های عمومی معمولاً رایگان است.",
    category: "OPEN_SPACE",
    lat: 36.322,
    lng: 59.473,
    city: "مشهد",
    district: "وکیل‌آباد",
    address: "انتهای بلوار وکیل‌آباد، پارک وکیل‌آباد",
    needsPermit: false,
    hasParking: true,
    securityLevel: "MEDIUM",
    suitableFor: PARK,
  },
];

async function main() {
  const prisma = new PrismaClient();
  let created = 0;
  let skipped = 0;
  try {
    for (const item of SEED) {
      const exists = await prisma.photoLocation.findUnique({
        where: { slug: item.slug },
        select: { id: true },
      });
      if (exists) {
        skipped += 1;
        continue;
      }
      const cover = MOOD[item.category] || MOOD.OTHER;
      const row = await prisma.photoLocation.create({
        data: {
          name: item.name,
          slug: item.slug,
          description: item.description,
          category: item.category,
          lat: item.lat,
          lng: item.lng,
          city: item.city,
          district: item.district,
          address: item.address,
          needsPermit: item.needsPermit,
          proCameraAllowed: true,
          phoneCameraAllowed: true,
          hasEntranceFee: false,
          hasChangingRoom: false,
          hasParking: item.hasParking,
          securityLevel: item.securityLevel,
          coverImageUrl: cover,
          imageUrls: JSON.stringify([cover]),
          status: "APPROVED",
          reviewedAt: new Date(),
        },
      });
      try {
        await prisma.photoLocation.update({
          where: { id: row.id },
          data: { suitableFor: JSON.stringify(item.suitableFor) },
        });
      } catch {
        await prisma.$executeRawUnsafe(
          "UPDATE photo_locations SET suitable_for = ? WHERE id = ?",
          JSON.stringify(item.suitableFor),
          row.id
        );
      }
      created += 1;
      console.log("✓", item.name);
    }
    console.log(
      `\nDone. created=${created} skipped=${skipped} total=${SEED.length}`
    );
    console.log("DB:", path.resolve(process.cwd(), "data", "jar.db"));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
