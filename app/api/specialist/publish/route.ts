import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { CATEGORIES_BY_SLUG } from "@/lib/categories";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." },
        { status: 401 }
      );
    }

    // Fetch specialist profile with their portfolio items
    const specialist = await prisma.specialistProfile.findUnique({
      where: { userId: session.userId },
      include: {
        portfolioItems: true,
      },
    });

    if (!specialist) {
      return NextResponse.json(
        { success: false, error: "پروفایل متخصص یافت نشد." },
        { status: 404 }
      );
    }

    let selectedCategories: string[] = [];
    try {
      if (specialist.selectedCategories) {
        selectedCategories = JSON.parse(specialist.selectedCategories);
      }
    } catch {
      selectedCategories = [];
    }

    // 1. Validate minimum 3 categories
    if (selectedCategories.length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: `برای انتشار پروفایل، باید حداقل ۳ شاخه تخصصی انتخاب کنید (تعداد فعلی: ${selectedCategories.length}).`,
        },
        { status: 400 }
      );
    }

    // 2. Count PortfolioItems for each selected category
    const itemsCountBySlug: Record<string, number> = {};
    for (const item of specialist.portfolioItems) {
      itemsCountBySlug[item.categorySlug] =
        (itemsCountBySlug[item.categorySlug] || 0) + 1;
    }

    const incompleteCategories: { slug: string; title: string; count: number }[] = [];

    for (const slug of selectedCategories) {
      const count = itemsCountBySlug[slug] || 0;
      if (count < 10) {
        const catDef = CATEGORIES_BY_SLUG[slug];
        incompleteCategories.push({
          slug,
          title: catDef?.title || slug,
          count,
        });
      }
    }

    // 3. Strict Backend Validation: If even one category has less than 10 items, reject with 400
    if (incompleteCategories.length > 0) {
      const details = incompleteCategories
        .map((c) => `«${c.title}» (${c.count}/۱۰ فایل)`)
        .join("، ");

      return NextResponse.json(
        {
          success: false,
          error: `برای انتشار پروفایل، باید برای تمام دسته‌بندی‌های انتخابی حداقل ۱۰ نمونه‌کار آپلود شده باشد (یا دسته‌های ناقص را غیرفعال کنید). شاخه‌های ناقص: ${details}`,
          incompleteCategories,
        },
        { status: 400 }
      );
    }

    // 4. Update SpecialistProfile with agreedToTerms and timestamp
    await prisma.specialistProfile.update({
      where: { id: specialist.id },
      data: {
        agreedToTerms: true,
        termsAgreedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "پرونده متخصص با موفقیت تایید و منتشر شد.",
    });
  } catch (error: any) {
    console.error("[specialist/publish API error]", error);
    return NextResponse.json(
      { success: false, error: "خطای سرور در تایید نهایی پرونده." },
      { status: 500 }
    );
  }
}
