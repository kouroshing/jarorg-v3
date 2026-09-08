/**
 * Offline & Online Reverse Geocoding for Iran
 * Provides instantaneous 0ms offline city/district resolution for Iran and Tehran,
 * with progressive enrichment via Neshan, Nominatim, or Photon API.
 */

export interface DistrictBox {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  mainStreet?: string;
}

export interface FastLocationResult {
  district: string;
  address: string;
}

export const TEHRAN_DISTRICTS: DistrictBox[] = [
  // Shemiranat / Region 1
  { name: "تهران، تجریش و شمیرانات", minLat: 35.79, maxLat: 35.84, minLng: 51.40, maxLng: 51.45, mainStreet: "میدان تجریش، خیابان فناخسرو" },
  { name: "تهران، نیاوران و دارآباد", minLat: 35.80, maxLat: 35.85, minLng: 51.45, maxLng: 51.52, mainStreet: "خیابان شهید باهنر (نیاوران)" },
  { name: "تهران، ولنجک و زعفرانیه", minLat: 35.79, maxLat: 35.84, minLng: 51.38, maxLng: 51.42, mainStreet: "زعفرانیه، خیابان مقدس اردبیلی" },
  { name: "تهران، الهیه و فرشته", minLat: 35.78, maxLat: 35.82, minLng: 51.41, maxLng: 51.44, mainStreet: "الهیه، خیابان فرشته (شهید فیاضی)" },
  { name: "تهران، فرمانیه و کامرانیه", minLat: 35.78, maxLat: 35.83, minLng: 51.45, maxLng: 51.49, mainStreet: "بلوار شهید لواسانی (فرمانیه)" },
  { name: "تهران، قیطریه و چیذر", minLat: 35.77, maxLat: 35.81, minLng: 51.43, maxLng: 51.46, mainStreet: "بلوار صبا، روبروی پارک قیطریه" },

  // Region 2
  { name: "تهران، سعادت‌آباد", minLat: 35.77, maxLat: 35.81, minLng: 51.35, maxLng: 51.39, mainStreet: "سعادت‌آباد، بلوار سرو غربی" },
  { name: "تهران، شهرک غرب", minLat: 35.74, maxLat: 35.78, minLng: 51.35, maxLng: 51.38, mainStreet: "شهرک غرب، بلوار دادمان" },
  { name: "تهران، گیشا و شهرآرا", minLat: 35.71, maxLat: 35.75, minLng: 51.36, maxLng: 51.39, mainStreet: "خیابان نصر (گیشا)" },
  { name: "تهران، ستارخان و طرشت", minLat: 35.70, maxLat: 35.73, minLng: 51.34, maxLng: 51.37, mainStreet: "خیابان ستارخان، نرسیده به پل یادگار" },

  // Region 3
  { name: "تهران، ونک و ملاصدرا", minLat: 35.75, maxLat: 35.78, minLng: 51.38, maxLng: 51.42, mainStreet: "میدان ونک، خیابان ملاصدرا" },
  { name: "تهران، میرداماد و جردن", minLat: 35.75, maxLat: 35.78, minLng: 51.41, maxLng: 51.44, mainStreet: "بلوار میرداماد، تقاطع خیابان آفریقا (جردن)" },
  { name: "تهران، قلهک و دروس", minLat: 35.76, maxLat: 35.79, minLng: 51.43, maxLng: 51.47, mainStreet: "خیابان کلاهدوز (دولت)، تقاطع دروس" },

  // Region 4 & 8
  { name: "تهران، پاسداران و هروی", minLat: 35.75, maxLat: 35.80, minLng: 51.46, maxLng: 51.50, mainStreet: "خیابان پاسداران، میدان هروی" },
  { name: "تهران، تهرانپارس", minLat: 35.72, maxLat: 35.76, minLng: 51.51, maxLng: 51.56, mainStreet: "فلکه اول تهرانپارس، خیابان رشید" },
  { name: "تهران، نارمک و هفت‌حوض", minLat: 35.71, maxLat: 35.75, minLng: 51.48, maxLng: 51.52, mainStreet: "میدان نبوت (هفت‌حوض)، خیابان آیت" },
  { name: "تهران، مجیدیه و شمس‌آباد", minLat: 35.73, maxLat: 35.76, minLng: 51.46, maxLng: 51.49, mainStreet: "بلوار بیژن، خیابان شمس‌آباد" },

  // Region 5 & 22
  { name: "تهران، پونک و باغ‌فیض", minLat: 35.75, maxLat: 35.78, minLng: 51.31, maxLng: 51.35, mainStreet: "میدان پونک، بلوار میرزابابایی" },
  { name: "تهران، جنت‌آباد و شاهین", minLat: 35.74, maxLat: 35.78, minLng: 51.29, maxLng: 51.32, mainStreet: "جنت‌آباد مرکزی، بلوار بعثت" },
  { name: "تهران، صادقیه و بلوار فردوس", minLat: 35.71, maxLat: 35.74, minLng: 51.31, maxLng: 51.35, mainStreet: "فلکه دوم صادقیه، بلوار فردوس شرق" },
  { name: "تهران، شهران و کوهسار", minLat: 35.77, maxLat: 35.80, minLng: 51.28, maxLng: 51.31, mainStreet: "بلوار شهران، تقاطع کوهسار" },
  { name: "تهران، چیتگر و دریاچه", minLat: 35.72, maxLat: 35.76, minLng: 51.18, maxLng: 51.26, mainStreet: "دریاچه شهدای خلیج فارس، میدان موج" },

  // Region 6 & 7
  { name: "تهران، یوسف‌آباد", minLat: 35.72, maxLat: 35.75, minLng: 51.39, maxLng: 51.42, mainStreet: "خیابان سید جمال‌الدین اسدآبادی (یوسف‌آباد)" },
  { name: "تهران، امیرآباد و فاطمی", minLat: 35.71, maxLat: 35.74, minLng: 51.37, maxLng: 51.40, mainStreet: "خیابان کارگر شمالی، تقاطع میدان فاطمی" },
  { name: "تهران، میدان ولیعصر و کشاورز", minLat: 35.70, maxLat: 35.72, minLng: 51.39, maxLng: 51.42, mainStreet: "بلوار کشاورز، تقاطع خیابان فلسطین" },
  { name: "تهران، سهروردی و عباس‌آباد", minLat: 35.72, maxLat: 35.75, minLng: 51.42, maxLng: 51.46, mainStreet: "خیابان سهروردی شمالی، تقاطع خیابان بهشتی" },
  { name: "تهران، مطهری و بهشتی", minLat: 35.71, maxLat: 35.73, minLng: 51.41, maxLng: 51.45, mainStreet: "خیابان شهید مطهری، خیابان میرعماد" },

  // Region 9, 10, 11, 12
  { name: "تهران، میدان آزادی و فرودگاه", minLat: 35.68, maxLat: 35.71, minLng: 51.31, maxLng: 51.36, mainStreet: "میدان آزادی، جناح جنوبی" },
  { name: "تهران، جی و مهرآباد", minLat: 35.67, maxLat: 35.70, minLng: 51.32, maxLng: 51.36, mainStreet: "بلوار شهید دستغیب، خیابان جی" },
  { name: "تهران، انقلاب و جمالزاده", minLat: 35.69, maxLat: 35.71, minLng: 51.38, maxLng: 51.41, mainStreet: "خیابان انقلاب، نبش خیابان جمالزاده" },
  { name: "تهران، فردوسی و لاله زار", minLat: 35.68, maxLat: 35.70, minLng: 51.41, maxLng: 51.43, mainStreet: "خیابان فردوسی، بالاتر از جمهوری" },
  { name: "تهران، بازار و ۱۵ خرداد", minLat: 35.66, maxLat: 35.69, minLng: 51.40, maxLng: 51.43, mainStreet: "خیابان ۱۵ خرداد، سبزه میدان" },
  { name: "تهران، بهارستان و دروازه شمیران", minLat: 35.68, maxLat: 35.70, minLng: 51.43, maxLng: 51.46, mainStreet: "میدان بهارستان، خیابان مصطفی خمینی" },

  // Region 13 & 14
  { name: "تهران، پیروزی و نیروهوایی", minLat: 35.68, maxLat: 35.71, minLng: 51.47, maxLng: 51.52, mainStreet: "خیابان پیروزی، نبش خیابان اول نیروی هوایی" },
  { name: "تهران، تهران‌نو و دماوند", minLat: 35.70, maxLat: 35.73, minLng: 51.49, maxLng: 51.53, mainStreet: "خیابان دماوند، روبروی پل تهران‌نو" },

  // Southern Tehran
  { name: "تهران، نازی‌آباد و راه‌آهن", minLat: 35.63, maxLat: 35.67, minLng: 51.38, maxLng: 51.42, mainStreet: "نازی‌آباد، خیابان شهید رجایی" },
  { name: "تهران، شهر ری", minLat: 35.58, maxLat: 35.63, minLng: 51.40, maxLng: 51.46, mainStreet: "میدان حرم حضرت عبدالعظیم، خیابان فداییان اسلام" },
];

export const IRAN_CITIES: DistrictBox[] = [
  { name: "کرج", minLat: 35.76, maxLat: 35.90, minLng: 50.85, maxLng: 51.10, mainStreet: "بلوار طالقانی، میدان شهدا" },
  { name: "اصفهان", minLat: 32.55, maxLat: 32.75, minLng: 51.55, maxLng: 51.78, mainStreet: "خیابان چهارباغ عباسی" },
  { name: "شیراز", minLat: 29.50, maxLat: 29.75, minLng: 52.40, maxLng: 52.65, mainStreet: "بلوار ارم، میدان دانشجو" },
  { name: "مشهد", minLat: 36.20, maxLat: 36.40, minLng: 59.45, maxLng: 59.75, mainStreet: "بلوار احمدآباد، خیابان راهنمایی" },
  { name: "تبریز", minLat: 38.00, maxLat: 38.15, minLng: 46.20, maxLng: 46.40, mainStreet: "خیابان امام خمینی، آبرسان" },
  { name: "اهواز", minLat: 31.25, maxLat: 31.42, minLng: 48.60, maxLng: 48.78, mainStreet: "کیانپارس، خیابان شهید چمران" },
  { name: "رشت", minLat: 37.20, maxLat: 37.35, minLng: 49.50, maxLng: 49.65, mainStreet: "میدان شهرداری، بلوار گلسار" },
  { name: "قم", minLat: 34.58, maxLat: 34.72, minLng: 50.80, maxLng: 50.95, mainStreet: "بلوار شهید صدوقی (زنبیل‌آباد)" },
  { name: "کیش", minLat: 26.48, maxLat: 26.58, minLng: 53.90, maxLng: 54.05, mainStreet: "بلوار ساحل، میدان سنایی" },
  { name: "قشم", minLat: 26.85, maxLat: 27.05, minLng: 56.10, maxLng: 56.35, mainStreet: "بلوار ولیعصر، بازار قدیم" },
  { name: "یزد", minLat: 31.80, maxLat: 31.95, minLng: 54.30, maxLng: 54.45, mainStreet: "میدان امیرچخماق، خیابان امام" },
  { name: "کرمان", minLat: 30.25, maxLat: 30.35, minLng: 57.00, maxLng: 57.15, mainStreet: "بلوار جمهوری اسلامی" },
  { name: "همدان", minLat: 34.75, maxLat: 34.85, minLng: 48.45, maxLng: 48.58, mainStreet: "میدان امام خمینی، خیابان بوعلی" },
  { name: "کرمانشاه", minLat: 34.28, maxLat: 34.38, minLng: 47.00, maxLng: 47.15, mainStreet: "خیابان فردوسی، میدان آیت‌الله کاشانی" },
  { name: "بندرعباس", minLat: 27.15, maxLat: 27.25, minLng: 56.20, maxLng: 56.38, mainStreet: "بلوار ساحلی، میدان یادبود" },
  { name: "ارومیه", minLat: 37.50, maxLat: 37.60, minLng: 45.00, maxLng: 45.15, mainStreet: "خیابان خیام جنوبی، میدان انقلاب" },
  { name: "زنجان", minLat: 36.64, maxLat: 36.72, minLng: 48.45, maxLng: 48.55, mainStreet: "خیابان سعدی شمالی، میدان انقلاب" },
  { name: "سنندج", minLat: 35.28, maxLat: 35.36, minLng: 46.95, maxLng: 47.05, mainStreet: "میدان آزادی، خیابان پاسداران" },
  { name: "گرگان", minLat: 36.80, maxLat: 36.90, minLng: 54.40, maxLng: 54.50, mainStreet: "خیابان ولیعصر (شالیکوبی)" },
  { name: "ساری", minLat: 36.53, maxLat: 36.60, minLng: 53.02, maxLng: 53.10, mainStreet: "میدان ساعت، خیابان قارن" },
  { name: "بابل", minLat: 36.52, maxLat: 36.58, minLng: 52.65, maxLng: 52.72, mainStreet: "خیابان مدرس، چهارراه شهربانی" },
  { name: "آمل", minLat: 36.44, maxLat: 36.50, minLng: 52.32, maxLng: 52.40, mainStreet: "خیابان هراز (شهید قاسم سلیمانی)" },
  { name: "بوشهر", minLat: 28.90, maxLat: 29.00, minLng: 50.80, maxLng: 50.90, mainStreet: "بلوار امام خمینی، خیابان ساحلی" },
  { name: "قزوین", minLat: 36.25, maxLat: 36.32, minLng: 49.95, maxLng: 50.05, mainStreet: "خیابان خیام شمالی، میدان عدل" },
  { name: "اراک", minLat: 34.05, maxLat: 34.15, minLng: 49.65, maxLng: 49.75, mainStreet: "میدان شهدا، خیابان شهید شیرودی" },
  { name: "خرم‌آباد", minLat: 33.45, maxLat: 33.55, minLng: 48.30, maxLng: 48.40, mainStreet: "میدان کیو، بلوار ولایت" },
  { name: "کاشان", minLat: 33.95, maxLat: 34.02, minLng: 51.40, maxLng: 51.50, mainStreet: "میدان جهاد، خیابان بابا افضل" },
  { name: "سمنان", minLat: 35.55, maxLat: 35.62, minLng: 53.35, maxLng: 53.45, mainStreet: "میدان مشاهیر، بلوار قدس" },
];

/**
 * Instantly resolves approximate city, district, and baseline street for Iranian coordinates without network lag
 */
export function getFastIranLocation(lat: number, lng: number): FastLocationResult {
  // 1. Check specific Tehran neighborhoods
  for (const box of TEHRAN_DISTRICTS) {
    if (lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng) {
      return {
        district: box.name,
        address: box.mainStreet || `محدوده ${box.name.replace("تهران، ", "")}`,
      };
    }
  }

  // 2. Check general Greater Tehran
  if (lat >= 35.55 && lat <= 35.85 && lng >= 51.10 && lng <= 51.65) {
    return {
      district: "تهران",
      address: "محدوده مرکزی تهران",
    };
  }

  // 3. Check other Iranian cities
  for (const city of IRAN_CITIES) {
    if (lat >= city.minLat && lat <= city.maxLat && lng >= city.minLng && lng <= city.maxLng) {
      return {
        district: city.name,
        address: city.mainStreet || `مرکز شهر ${city.name}`,
      };
    }
  }

  // 4. Default for Iran
  if (lat >= 24.5 && lat <= 40.0 && lng >= 44.0 && lng <= 63.5) {
    return {
      district: "ایران",
      address: "",
    };
  }

  return {
    district: "تهران",
    address: "",
  };
}

/**
 * Backward-compatible fast district lookup
 */
export function getFastIranDistrict(lat: number, lng: number): string {
  return getFastIranLocation(lat, lng).district;
}

