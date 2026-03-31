#!/usr/bin/env tsx
/**
 * Production data seed — idempotent upsert of ALL dynamic data.
 * Covers: categories, packages, testimonials, gallery albums+items, site settings.
 * Safe to run on every deployment.
 */

import { db } from "@workspace/db";
import {
  categories, packages,
  testimonials, galleryAlbums, galleryItems, siteSettings,
} from "@workspace/db/schema";
import { sql, eq } from "drizzle-orm";

async function main() {

  // ─── CATEGORIES ────────────────────────────────────────────────────────────
  console.log("🌱  Seeding categories...");
  const realCategories = [
    { slug: "yacht",     nameAr: "يخت",        nameEn: "Yacht",         sortOrder: 1 },
    { slug: "safari",    nameAr: "سفاري",       nameEn: "Safari",        sortOrder: 2 },
    { slug: "parasail",  nameAr: "براشوت",      nameEn: "Parasailing",   sortOrder: 3 },
    { slug: "aquapark",  nameAr: "أكوا بارك",   nameEn: "Aqua Park",     sortOrder: 4 },
    { slug: "family",    nameAr: "عائلي",       nameEn: "Family",        sortOrder: 5 },
    { slug: "complete",  nameAr: "شامل",        nameEn: "All-Inclusive", sortOrder: 6 },
  ];
  for (const cat of realCategories) {
    await db.insert(categories).values(cat)
      .onConflictDoUpdate({
        target: categories.slug,
        set: { nameAr: cat.nameAr, nameEn: cat.nameEn, sortOrder: cat.sortOrder },
      });
  }
  console.log(`✅  Upserted ${realCategories.length} categories`);

  // ─── PACKAGES ──────────────────────────────────────────────────────────────
  console.log("🌱  Seeding packages...");
  const realPackages = [
    {
      slug: "aqua-park-crazy-day",
      icon: "🏖️🌊",
      titleAr: "🎉🌊 *اكوا بارك ـ CRAZY DAY WATER* 🌊🎉",
      titleEn: "🎉🌊 *CRAZY DAY WATER* 🌊🎉",
      descriptionAr: "أكبر مدينة ألعاب مائية في مطروح 😍💦\n\nعايز تعيش يوم كله ضحك وأكشن وسط أجواء صيفية منعشة؟\nتعالى جرّب *أقوى تجربة أكوا بارك* في مرسى مطروح! 🔥",
      descriptionEn: "The biggest water park in Marsa Matrouh! 😍💦\n\nWant to spend a day full of laughter and action in a refreshing summer atmosphere?\n\nCome and experience the *most exciting water park* in Marsa Matrouh! 🔥",
      longDescriptionAr: "✨ *المميزات:*\n✅ 3 حمامات سباحة (1 للأطفال + 2 للكبار)\n✅ ألعاب مائية ممتعة للكبار والصغار\n✅ قعدات مريحة وشازلونجات\n✅ حمامات نضيفة ومجهزة بالكامل 🚻\n✅ مطاعم وسوبر ماركت وخدمات متكاملة\n✅ أجواء موسيقى و DJ طول اليوم 🎶\n\n💸 *والمفاجأة:*\nاليوم الكامل بسعر مناسب جدًا 🔥 يناسب كل العيلة 👨‍👩‍👧‍👦\n\n🎁 *عروض مميزة:*\n👶 أقل من 3 سنوات مجانًا\n👧👴 الأطفال من 3 لـ 9 سنين / كبار السن فوق الـ60 سنة *خصم 50%*",
      longDescriptionEn: "✨ *Features:*\n\n✅ 3 swimming pools (1 for children + 2 for adults)\n\n✅ Fun water games for adults and children\n\n✅ Comfortable seating areas and sun loungers\n\n✅ Clean and fully equipped restrooms 🚻\n✅ Restaurants, supermarket, and comprehensive services\n\n✅ Music and DJ all day long 🎶\n\n💸 *And the surprise:*\n\nThe full day at a very reasonable price 🔥 Suitable for the whole family 👨‍👩‍👧‍👦\n\n🎁 *Special Offers:*\n\n👶 Under 3 years old free\n👧👴 Children aged 3-9 / Seniors over 60 years old *50% discount*",
      category: "aquapark",
      priceEGP: 400, maxPriceEGP: null,
      durationAr: "7 ساعات ", durationEn: "7 hours ",
      color: "#00AAFF", badgeAr: "", badgeEn: "", badgeColor: "#C9A84C",
      featured: true, popular: true, familyFriendly: true, foreignerFriendly: true, childrenFriendly: true,
      experienceLevel: "easy", rating: "4.5", reviewCount: 0,
      images: [
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2Fa7cdf6a3-ca47-49aa-b390-e64b0a633246",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2F3a2f88c0-6c2a-4b79-b9a6-6b0778048443",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2Fedd559d6-8823-4c9a-811c-228182e60983",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2F4425d9b8-db04-4cc2-aea9-06295805d18a",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2Fe8b40453-a971-4e1b-a52e-e8a1e4ea5207",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2Fa704f5f5-3745-4d06-82d8-9feda81de440",
      ],
      includesAr: [], includesEn: [], excludesAr: [], excludesEn: [],
      itineraryAr: [], itineraryEn: [], whyThisTripAr: [], whyThisTripEn: [],
      suitableFor: [], whatToBringAr: [], whatToBringEn: [],
      hasCancellationPolicy: false, cancellationAr: "", cancellationEn: "",
      faq: [], similarIds: [],
      includesMeals: false, includesTransport: false, includesAccommodation: false,
      minGroupSize: 1, maxGroupSize: 20, active: true, status: "published", sortOrder: 10,
    },
    {
      slug: "parachute",
      icon: "🪂",
      titleAr: "باراشوت ",
      titleEn: "parachute🪂",
      descriptionAr: "رحلة باراشوت فوق 100 متر من سطح الارض ",
      descriptionEn: "Parachute flight over 100 meters above the Earth's surface",
      longDescriptionAr: "رحلة الباراشوت تجربة مليانة إثارة وحرية هتخليك تشوف البحر من زاوية عمرَك ما شفتها قبل كده 🌊✨\n\nهتبدأ رحلتك بجولة ممتعة باللانش لمدة حوالي 20 دقيقة، تستمتع فيها بنسيم الهوا ومنظر المية الواسع والأجواء الصيفية المبهجة. بعد كده بييجي وقت المغامرة الحقيقية 🚤🔥\n\nهتطير بالباراشوت من 7 لـ10 دقايق فوق البحر، تحس فيها إنك بتحلق في السما، وتشوف المنظر البانورامي الخرافي حواليك… مزيج من الهدوء والإثارة في نفس اللحظة 🪂💙\n\nتجربة آمنة، ممتعة، ومناسبة لأي حد عايز يجرب إحساس مختلف ويعمل ذكريات عمرها ما تتنسي!\n",
      longDescriptionEn: "The parasailing trip is a thrilling and unforgettable experience that lets you see the sea from a whole new perspective 🌊✨\n\nYour journey starts with a fun 20-minute speedboat ride, where you can enjoy the fresh breeze, the wide open water, and the vibrant summer vibes. Then comes the real adventure 🚤🔥\n\nYou'll soar in the air for 7 to 10 minutes while parasailing, feeling like you're flying above the sea, taking in breathtaking panoramic views all around you… a perfect mix of peace and excitement at the same time 🪂💙\n\nIt's a safe, fun experience and perfect for anyone looking to try something new and create unforgettable memories!\n",
      category: "parasail",
      priceEGP: 500, maxPriceEGP: null,
      durationAr: "7_10د", durationEn: "7_10 mines ",
      color: "#00AAFF", badgeAr: "", badgeEn: "", badgeColor: "#C9A84C",
      featured: true, popular: true, familyFriendly: true, foreignerFriendly: true, childrenFriendly: true,
      experienceLevel: "moderate", rating: "4.5", reviewCount: 0,
      images: [
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2Fe8f0c71a-c488-45f0-81a1-879e805041bd",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2F6978cfa5-8f05-4d44-8ec2-dfa5bc1c71d0",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2F89a54eae-78fb-45a0-a89a-907dc1b98b2a",
      ],
      includesAr: [], includesEn: [], excludesAr: [], excludesEn: [],
      itineraryAr: [], itineraryEn: [], whyThisTripAr: [], whyThisTripEn: [],
      suitableFor: [], whatToBringAr: [], whatToBringEn: [],
      hasCancellationPolicy: false, cancellationAr: "", cancellationEn: "",
      faq: [], similarIds: [],
      includesMeals: false, includesTransport: false, includesAccommodation: false,
      minGroupSize: 1, maxGroupSize: 20, active: true, status: "published", sortOrder: 20,
    },
    {
      slug: "aqua-park-",
      icon: "🏖️",
      titleAr: "اكوا بارك WAWA LAND",
      titleEn: "WAWA LAND AQUA PARK ",
      descriptionAr: "استعد ليوم ملئ ب المتعه والاثاره والتسليه للأطفال والكبار ",
      descriptionEn: "Enjoy a fun-filled and exciting day for children and adults",
      longDescriptionAr: "✨ *المميزات:*\n✅ 2حمامات سباحة (1 للأطفال + 1 للكبار)\n✅ ألعاب مائية ممتعة للكبار والصغار\n✅ قعدات مريحة وشازلونجات\n✅ حمامات نضيفة ومجهزة بالكامل 🚻\n✅شاطئ مجهز بالكامل مناسب للأطفال والكبار \n✅ مطاعم وسوبر ماركت وخدمات متكاملة\n✅ أجواء موسيقى و DJ طول اليوم 🎶\n\n💸 *والمفاجأة:*\nاليوم الكامل بسعر مناسب جدًا 🔥 يناسب كل العيلة 👨‍👩‍👧‍👦\n",
      longDescriptionEn: "✨ *Features:*\n\n✅ 2 swimming pools (1 for children + 1 for adults)\n\n✅ Fun water games for adults and children\n\n✅ Comfortable seating areas and sun loungers\n✅ Clean and fully equipped restrooms 🚻 ✅ Fully equipped beach suitable for children and adults\n✅ Restaurants, supermarket, and comprehensive services\n✅ Music and DJ entertainment all day long 🎶\n\n💸 *And the surprise:*\n\nThe full day at a very reasonable price 🔥 Suitable for the whole family 👨‍👩‍👧‍👦",
      category: "aquapark",
      priceEGP: 350, maxPriceEGP: null,
      durationAr: "6 ساعات ", durationEn: "6 hours ",
      color: "#00AAFF", badgeAr: "", badgeEn: "", badgeColor: "#C9A84C",
      featured: true, popular: true, familyFriendly: true, foreignerFriendly: true, childrenFriendly: true,
      experienceLevel: "easy", rating: "4.5", reviewCount: 0,
      images: [
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2Fbe86d6fe-b22d-4f29-97e2-8a95190a7415",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2Fbf8de69a-9ddc-4236-9942-8ba0b9cf5c12",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2Fe8024322-7a31-418e-82db-33b14aa9c9c4",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2Ffaa4b7e7-9347-430e-b32a-137b02f758df",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2F258659b8-4e40-4d61-bf2a-c98f58cda0b4",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2Ff28bb8e3-3673-4d07-be74-43ac61498dd1",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2Fcf56969b-406f-4cfc-84aa-077c9cbd1a44",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2F0ec5e026-a032-40a0-b80b-15b28303e350",
      ],
      includesAr: [], includesEn: [], excludesAr: [], excludesEn: [],
      itineraryAr: [], itineraryEn: [], whyThisTripAr: [], whyThisTripEn: [],
      suitableFor: [], whatToBringAr: [], whatToBringEn: [],
      hasCancellationPolicy: false, cancellationAr: "", cancellationEn: "",
      faq: [], similarIds: [],
      includesMeals: false, includesTransport: false, includesAccommodation: false,
      minGroupSize: 1, maxGroupSize: 20, active: true, status: "published", sortOrder: 30,
    },
    {
      slug: "aqua-park-marseilia-",
      icon: "🏖️",
      titleAr: "مارسيليا اكوا بارك ",
      titleEn: "Marseilia Aqua park ",
      descriptionAr: "💦🌊 *مارسيليا أكوا بارك – أكبر مدينة ألعاب مائية في مطروح!* 🌊💦",
      descriptionEn: "💦🌊 *Marseilia Aqua Park – The Largest Water Park in Matrouh!* 🌊💦",
      longDescriptionAr: "💦🌊 *مارسيليا أكوا بارك – أكبر مدينة ألعاب مائية في مطروح!* 🌊💦\n\nلو بتدور على يوم مليان متعة ومرح ليك ولعيلتك 👨‍👩‍👧‍👦\nيبقى مفيش أحلى من *مارسيليا أكوا بارك* في قلب مطروح! 😍\n\n🎟️ *التذكرة تشمل:*\n✔️ دخول المكان بالكامل\n✔️ شازلونج مريح لكل فرد\n✔️ جميع الألعاب المائية بدون حدود\n✔️ استخدام كل حمامات السباحة\n\n👶 *الأطفال:*\n🔹 أقل من 3 سنوات: مجانًا\n🔹 من 3 سنوات فيما فوق: بيتحسبوا فرد\n\n⏰ *مواعيد التشغيل:*\nيوميًا من 10 صباحًا حتى 6 مساءً\n\n🔥 *مميزات المكان:*\n✨ ألعاب مائية متنوعة تناسب كل الأعمار\n✨ أجواء آمنة ومناسبة للعائلات\n✨ تجربة ممتعة للكبار والصغار\n✨ خصومات خاصة للمجموعات والأعداد ❤️\n\n💥 *احجز دلوقتي واستمتع بأحلى يوم صيفي!*\n",
      longDescriptionEn: "💦🌊 *Marseilia Aqua Park – The Largest Water Park in Matrouh!* 🌊💦\n\nLooking for a fun-filled day for you and your family? 👨‍👩‍👧‍👦\nThere's no better choice than *Marseilia Aqua Park* in the heart of Matrouh! 😍\n\n🎟️ *Ticket includes:*\n✔️ Full access to the park\n✔️ A comfortable sunbed for each person\n✔️ Unlimited access to all water games\n✔️ Access to all swimming pools\n\n⏰ *Opening hours:*\nDaily from 10:00 AM to 6:00 PM\n\n🔥 *Why choose us?*\n✨ A wide variety of water games for all ages\n✨ Safe and family-friendly environment\n✨ Fun experience for both adults and kids\n✨ Special discounts for groups ❤️\n\n💥 *Book now and enjoy the perfect summer day!*\n",
      category: "aquapark",
      priceEGP: 400, maxPriceEGP: null,
      durationAr: "7 ساعات", durationEn: "7 hours ",
      color: "#00AAFF", badgeAr: "", badgeEn: "", badgeColor: "#C9A84C",
      featured: true, popular: true, familyFriendly: true, foreignerFriendly: true, childrenFriendly: true,
      experienceLevel: "easy", rating: "4.5", reviewCount: 0,
      images: [
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2Fb8b98bf3-4709-4c29-9a24-9a0c51de0ac7",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2Fe95b2804-b763-443a-a653-7670722d9c9b",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2F24810284-1ff6-41b2-bf7d-fe023bf35a35",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2Fe092b3dd-7a61-4a48-b3cc-69b38a9e8dcf",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2F09254427-9f68-4a95-99ff-0aafc5996d91",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2F6ffdb8a5-a481-48a8-b561-25f0692c2494",
      ],
      includesAr: [], includesEn: [], excludesAr: [], excludesEn: [],
      itineraryAr: [], itineraryEn: [], whyThisTripAr: [], whyThisTripEn: [],
      suitableFor: [], whatToBringAr: [], whatToBringEn: [],
      hasCancellationPolicy: false, cancellationAr: "", cancellationEn: "",
      faq: [], similarIds: [],
      includesMeals: false, includesTransport: false, includesAccommodation: false,
      minGroupSize: 1, maxGroupSize: 20, active: true, status: "published", sortOrder: 40,
    },
    {
      slug: "full-safari",
      icon: "🏜️",
      titleAr: "باقة السفاري الكاملة ",
      titleEn: "Full Safari Package ",
      descriptionAr: "انطلق في مغامرة صحراوية لا تُنسى وسط رمال مطروح الذهبية ",
      descriptionEn: "Embark on an unforgettable desert adventure across the golden sands of Matruh",
      longDescriptionAr: "تجربة السفاري الصحراوية في مرسى مطروح هي واحدة من أكثر التجارب إثارةً هتجربها في رحلتك في مطروح. ستنطلق مع فريقنا المحترف عبر الكثبان الرملية الذهبية، تستمتع بأجواء الصحراء الساحرة وتعيش لحظات لا تُنسى من الإثارة والمغامرة. \n\n*برنامج الرحله يشمل*\n\n🔹 **الانتقالات من وإلى موقع السفاري**\n🔹 **وجبة بدوية فاخرة** من مطبخ \"أبو مردم\":\n* فراخ مندي\n* رز أو مكرونة مبكبكة\n* شوربة\n* سلطة\n* مخلل\n\n🔹 **مشروبات**: شاي زردة بدوي + مياه معدنية\n🔹 **بيتش باجي** لكل فردين لمدة **15 دقيقة**\n🔹 **سهرة بدوية ساحرة** داخل خيم مخصصة للعائلات\n🔹 **فقرات ترفيهية متنوعة**:\n\n* فاير شو🔥\n* رقصة التنورة 💃\n* فقرات بدوية وألعاب شعبية\n* فقرات خاصة للأطفال 🎈\n* مفاجآت على مدار السهرة 🎉\n\n🛖 متوفر **قعدات بدوية** وكراسي مريحة لضمان استجمامك الكامل.",
      longDescriptionEn: "The desert safari experience in Marsa Matrouh is one of the most exciting experiences you'll have on your trip to Matrouh. You'll embark with our professional team across the golden sand dunes, enjoying the enchanting desert atmosphere and experiencing unforgettable moments of excitement and adventure.\n\n*Trip Program Includes*\n\n🔹 **Transportation to and from the Safari Site**\n🔹 **A Luxurious Bedouin Meal** from Abu Mardam's Kitchen:\n* Mandi Chicken\n* Rice or Makaniya Mbekbeka\n* Soup\n* Salad\n* Pickles\n\n🔹 **Drinks**: Bedouin Zarda Tea + Mineral Water\n🔹 **Beach Buggy** for two people for **15 minutes**\n🔹 **A Magical Bedouin Evening** in Family-Friendly Tents\n🔹 **Various Entertainment**:\n* Fire Show 🔥\n* Tanoura Dance 💃\n* Bedouin Performances and Traditional Games\n* Special Activities for Children 🎈\n* Surprises Throughout the Evening 🎉",
      category: "safari",
      priceEGP: 350, maxPriceEGP: 356,
      durationAr: "يوم كامل — 8 ساعات", durationEn: "Full Day — 8 Hours",
      color: "#F59E0B", badgeAr: "الأكثر شيوعاً", badgeEn: "Most Popular", badgeColor: "#C9A84C",
      featured: true, popular: true, familyFriendly: true, foreignerFriendly: true, childrenFriendly: false,
      experienceLevel: "moderate", rating: "4.9", reviewCount: 312,
      images: [
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2F9b8129b8-9154-4fa4-9a36-567be1065b70",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2F52482b33-9a56-479d-902b-a7e0e427117b",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2F52883249-f564-4412-a3be-b4860c4a1978",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2F21051879-8738-4712-93c6-06ece1724330",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2F12ca2332-c3c9-4f39-bc96-e4e2e4aa048d",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2F00cc6187-c7da-4c5c-a3e8-7b54bb749009",
      ],
      includesAr: ["انتقالات من وإلى موقع السفاري", "وجبة بدوية فاخرة", "مشروبات بدوية", "بيتش باجي لكل فردين", "سهرة بدوية ساحرة", "فاير شو ورقصة التنورة"],
      includesEn: ["Transportation to/from Safari", "Luxurious Bedouin Meal", "Bedouin Drinks", "Beach Buggy for Two", "Magical Bedouin Evening", "Fire Show & Tanoura Dance"],
      excludesAr: ["المصاريف الشخصية", "التصوير الإضافي"],
      excludesEn: ["Personal expenses", "Extra photography"],
      itineraryAr: [], itineraryEn: [], whyThisTripAr: [], whyThisTripEn: [],
      suitableFor: [], whatToBringAr: [], whatToBringEn: [],
      hasCancellationPolicy: true,
      cancellationAr: "يمكن الإلغاء مجاناً قبل 24 ساعة من موعد الرحلة",
      cancellationEn: "Free cancellation up to 24 hours before the trip",
      faq: [], similarIds: [],
      includesMeals: true, includesTransport: true, includesAccommodation: false,
      minGroupSize: 1, maxGroupSize: 30, active: true, status: "published", sortOrder: 50,
    },
    {
      slug: "luxury-yacht",
      icon: "🚢",
      titleAr: "رحلات  اليخت البحريه 🛥️ ",
      titleEn: "🛥️ Sea yacht trips ",
      descriptionAr: "أبحر على متن يخت فاخر وشاهد جمال البحر المتوسط",
      descriptionEn: "Sail aboard a luxury yacht and discover the beauty of the Mediterranean Sea",
      longDescriptionAr: "تجربة اليخت مع DR Travel هي رحلة بحرية فاخرة لن تنساها. ستبحر على متن يخت حديث ومجهز بالكامل عبر المياه الزرقاء الصافية للبحر المتوسط، مع إمكانية السباحة والغطس وممارسة الألعاب المائية. \n الرحلة تشمل:\n• إبحار مميز وسط المياه الفيروزية\n• جلسات استرخاء وSunset ساحر\n• غطس في أجمل أماكن البحر الابيض المتوسط\n• DJ ومشروبات بأجواء راقية\n• تصوير احترافي يوثق اللحظة\n",
      longDescriptionEn: "The trip includes:\n\n• A unique voyage through turquoise waters\n• Relaxing sessions and a mesmerizing sunset\n• Snorkeling in some of the most beautiful spots in the Mediterranean Sea\n• A DJ and drinks in a sophisticated atmosphere\n• Professional photography to capture the moment",
      category: "yacht",
      priceEGP: 100, maxPriceEGP: null,
      durationAr: "٢-٣ ساعات", durationEn: "2_3 Hours",
      color: "#00AAFF", badgeAr: "", badgeEn: "", badgeColor: "#C9A84C",
      featured: false, popular: true, familyFriendly: true, foreignerFriendly: true, childrenFriendly: true,
      experienceLevel: "moderate", rating: "4.8", reviewCount: 189,
      images: [
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2F4488a18b-ba25-4968-9d56-26d92003b772",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2F24442c94-86e8-4763-b66a-961e7fa6bc9b",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2Fadae1d25-d548-4abb-8b0b-028cb7d29786",
        "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2Fc30d0f74-8d24-4229-b6b2-243b9d7572d5",
      ],
      includesAr: ["رحلة يخت بحرية فاخرة", "تصوير احترافي", "معدات الغطس والسباحة", "ابحار مميز وسط المياه الفيروزيه", "Dj وحفل موسيقى", "الاستمتاع بالمناظر الطبيعيه الخلابه ببحر مرسى مطروح"],
      includesEn: ["Luxury sea yacht ride", "Professional photography", "Diving & swimming equipment", "A unique voyage through turquoise waters", "DJ & music", "Stunning views of Marsa Matrouh sea"],
      excludesAr: [], excludesEn: [],
      itineraryAr: [], itineraryEn: [], whyThisTripAr: [], whyThisTripEn: [],
      suitableFor: [], whatToBringAr: [], whatToBringEn: [],
      hasCancellationPolicy: false, cancellationAr: "", cancellationEn: "",
      faq: [], similarIds: [],
      includesMeals: false, includesTransport: false, includesAccommodation: false,
      minGroupSize: 1, maxGroupSize: 20, active: true, status: "published", sortOrder: 60,
    },
    {
      slug: "all-inclusive",
      icon: "⭐",
      titleAr: "الباقة الشاملة",
      titleEn: "All-Inclusive Package",
      descriptionAr: "تجربة متكاملة تجمع كل ما تحبه في مكان واحد",
      descriptionEn: "A complete experience combining everything you love in one place",
      longDescriptionAr: "الباقة الشاملة هي تاج باقاتنا — تجمع بين جمال الصحراء وروعة البحر وإقامة فندقية مريحة في تجربة واحدة استثنائية. مناسبة للباحثين عن تجربة مطروح الكاملة بدون تعب الترتيب والتخطيط. فريقنا يتولى كل شيء لتعيش أفضل إجازة في حياتك.",
      longDescriptionEn: "The All-Inclusive package is the crown of our offerings — combining desert beauty, sea magnificence, and comfortable hotel accommodation in one exceptional experience. Perfect for those seeking the complete Matruh experience without the hassle of planning. Our team handles everything so you can enjoy the best vacation of your life.",
      category: "yacht",
      priceEGP: 1200, maxPriceEGP: 1800,
      durationAr: "يومان — ليلة واحدة", durationEn: "2 Days — 1 Night",
      color: "#A855F7", badgeAr: "قيمة استثنائية", badgeEn: "Exceptional Value", badgeColor: "#00AAFF",
      featured: false, popular: false, familyFriendly: true, foreignerFriendly: true, childrenFriendly: true,
      experienceLevel: "easy", rating: "4.9", reviewCount: 97,
      images: [
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
        "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200&q=80",
      ],
      includesAr: [], includesEn: [], excludesAr: [], excludesEn: [],
      itineraryAr: [], itineraryEn: [], whyThisTripAr: [], whyThisTripEn: [],
      suitableFor: [], whatToBringAr: [], whatToBringEn: [],
      hasCancellationPolicy: false, cancellationAr: "", cancellationEn: "",
      faq: [], similarIds: [],
      includesMeals: true, includesTransport: true, includesAccommodation: true,
      minGroupSize: 1, maxGroupSize: 10, active: true, status: "published", sortOrder: 70,
    },
  ];

  for (const pkg of realPackages) {
    await db.insert(packages).values(pkg as any)
      .onConflictDoUpdate({
        target: packages.slug,
        set: {
          titleAr: (pkg as any).titleAr, titleEn: (pkg as any).titleEn,
          descriptionAr: (pkg as any).descriptionAr, descriptionEn: (pkg as any).descriptionEn,
          longDescriptionAr: (pkg as any).longDescriptionAr, longDescriptionEn: (pkg as any).longDescriptionEn,
          images: (pkg as any).images,
          priceEGP: (pkg as any).priceEGP, maxPriceEGP: (pkg as any).maxPriceEGP,
          featured: (pkg as any).featured, popular: (pkg as any).popular,
          active: (pkg as any).active, status: (pkg as any).status,
          sortOrder: (pkg as any).sortOrder,
          includesAr: (pkg as any).includesAr, includesEn: (pkg as any).includesEn,
          excludesAr: (pkg as any).excludesAr, excludesEn: (pkg as any).excludesEn,
        },
      });
  }
  console.log(`✅  Upserted ${realPackages.length} packages`);

  // ─── TESTIMONIALS ──────────────────────────────────────────────────────────
  console.log("🌱  Seeding testimonials...");
  const existingTestimonials = await db.select({ id: testimonials.id }).from(testimonials);
  if (existingTestimonials.length === 0) {
    const realTestimonials = [
      { nameAr: "أحمد الشيخ", nameEn: "Ahmed El-Sheikh", textAr: "والله تجربة من التحفة! السفاري كانت خيال وناس DR Travel محترمين جداً وشاطرين. هنرجع تاني متأكد 💯", textEn: "An amazing experience! The safari was incredible and the DR Travel team was very professional. We'll definitely be back 💯", rating: 5, packageName: "full-safari", avatar: "أش", isVisible: true, sortOrder: 1 },
      { nameAr: "فاطمة سمير", nameEn: "Fatma Samir", textAr: "اليخت كان حلم بجد! المنظر من البحر ماشفتوش في حياتي. الخدمة تمام والأسعار معقولة جداً. شكراً يا DR Travel!", textEn: "The yacht was truly a dream! The view from the sea was unlike anything I've seen. Great service and very reasonable prices. Thank you DR Travel!", rating: 5, packageName: "luxury-yacht", avatar: "فس", isVisible: true, sortOrder: 2 },
      { nameAr: "محمد ربيع", nameEn: "Mohamed Rabie", textAr: "صحابي وأنا رحنا على باقة السفاري وكانت أحلى يوم في الصيف ده. البراشوت فوق البحر حاجة مش طبيعية أوي 🔥", textEn: "My friends and I did the safari package and it was the best day of this summer. Parasailing over the sea was an absolutely insane experience 🔥", rating: 5, packageName: "full-safari", avatar: "مر", isVisible: true, sortOrder: 3 },
      { nameAr: "نورهان طارق", nameEn: "Nourhan Tarek", textAr: "أخدت الباقة الشاملة مع عيلتي والعيال فرحوا جداً. الأكوا بارك كان تحفة والتعامل ممتاز من أول لآخر.", textEn: "I took the all-inclusive package with my family and the kids had a blast. The aqua park was amazing and the service was excellent from start to finish.", rating: 5, packageName: "all-inclusive", avatar: "نط", isVisible: true, sortOrder: 4 },
      { nameAr: "كريم الجمل", nameEn: "Karim El-Gamal", textAr: "أول مرة أروح مطروح وبقوا عاملين الحجة ليها. السفاري والألعاب المائية في يوم واحد؟ جامدين بجد!", textEn: "First time in Matruh and they made me fall in love with it. Safari and water sports in one day? Absolutely brilliant!", rating: 5, packageName: "full-safari", avatar: "كج", isVisible: true, sortOrder: 5 },
      { nameAr: "سلمى حسن", nameEn: "Salma Hassan", textAr: "خدمة على مستوى عالي جداً. الواتساب بيردوا في الحال وبيشرحوا كل حاجة بالتفصيل. الرحلة عدت تمام تمام 🌊", textEn: "Very high level of service. They respond on WhatsApp immediately and explain everything in detail. The trip went perfectly 🌊", rating: 5, packageName: "luxury-yacht", avatar: "سح", isVisible: true, sortOrder: 6 },
      { nameAr: "عمرو فتحي", nameEn: "Amr Fathy", textAr: "عملت مفاجأة لمراتي وأخدناها على اليخت. كانت أجمل مفاجأة في حياتها! شكراً للفريق على التنظيم الرائع.", textEn: "I surprised my wife with a yacht trip. It was the best surprise of her life! Thank you to the team for the wonderful organization.", rating: 5, packageName: "luxury-yacht", avatar: "عف", isVisible: true, sortOrder: 7 },
      { nameAr: "دينا البسيوني", nameEn: "Dina El-Bassiouny", textAr: "البحر في مطروح مختلف عن أي حاجة تانية. وركوب اليخت مع DR Travel زاد الموضوع جمال. هنفضل نيجي كل سنة!", textEn: "The sea in Matruh is different from anything else. Sailing with DR Travel made it even more beautiful. We'll keep coming back every year!", rating: 5, packageName: "luxury-yacht", avatar: "دب", isVisible: true, sortOrder: 8 },
      { nameAr: "يوسف السيد", nameEn: "Yousef El-Sayed", textAr: "الأسعار مناسبة جداً مقارنة بالخدمة اللي بيقدموها. جربت البراشوت للمرة الأولى وكانت أدرينالين خالص 🪂", textEn: "Prices are very reasonable compared to the service they provide. I tried parasailing for the first time and it was pure adrenaline 🪂", rating: 5, packageName: "full-safari", avatar: "يس", isVisible: true, sortOrder: 9 },
      { nameAr: "ريم عبدالعزيز", nameEn: "Reem Abdulaziz", textAr: "رحلة اليخت كانت منظمة أوي. في وجبة وألعاب مائية وموسيقى. احساس أننا في فيلا على البحر! تجربة ٥ نجوم.", textEn: "The yacht trip was very well organized. Food, water sports, and music — it felt like a villa on the sea! A true 5-star experience.", rating: 5, packageName: "luxury-yacht", avatar: "رع", isVisible: true, sortOrder: 10 },
      { nameAr: "إسلام جابر", nameEn: "Islam Jaber", textAr: "جبت عيلتي كلها، الكبار والصغار، وكلهم استمتعوا. الأولاد من الأكوا بارك والكبار من السفاري. تنظيم ممتاز!", textEn: "I brought my whole family — adults and kids — and everyone enjoyed themselves. Kids loved the aqua park, adults loved the safari. Great organization!", rating: 5, packageName: "family-package", avatar: "إج", isVisible: true, sortOrder: 11 },
      { nameAr: "منى الشرقاوي", nameEn: "Mona El-Sharqawi", textAr: "كنا خايفين الأول بس لما وصلنا الفريق كان متفهم ومحترف جداً. الرحلة عدت أحسن من توقعاتنا بكتير! 🚢", textEn: "We were a bit nervous at first, but when we arrived the team was incredibly understanding and professional. The trip exceeded our expectations by far! 🚢", rating: 5, packageName: "luxury-yacht", avatar: "مش", isVisible: true, sortOrder: 12 },
      { nameAr: "طارق عوض", nameEn: "Tarek Awad", textAr: "سنة على سنة بنيجي مطروح عند DR Travel. ناس بيستاهلوا الثقة. ما غيرناش ولا هنغير! كل سنة أحسن من اللي قبلها.", textEn: "Year after year we come to Matruh with DR Travel. People you can trust. We haven't changed and never will! Every year is better than the last.", rating: 5, packageName: "all-inclusive", avatar: "طع", isVisible: true, sortOrder: 13 },
      { nameAr: "آية الزهراء", nameEn: "Aya El-Zahraa", textAr: "البراشوت كانت الأكشن اللي كنت محتاجاه 😂 المنظر من فوق ده فيلم حقيقي. والتعامل محترم وآمن جداً.", textEn: "Parasailing was exactly the action I needed 😂 The view from up there is like a real movie. Very safe and respectful handling.", rating: 5, packageName: "full-safari", avatar: "آز", isVisible: true, sortOrder: 14 },
      { nameAr: "مصطفى البنا", nameEn: "Mostafa El-Banna", textAr: "حجزت للشركة بتاعتنا يوم تيم بيلدينج. الكل قال إنه أحسن نشاط عملناه في حياتنا. شكراً DR Travel على الاحترافية!", textEn: "I booked a team building day for our company. Everyone said it was the best activity we've ever done. Thank you DR Travel for the professionalism!", rating: 5, packageName: "all-inclusive", avatar: "مب", isVisible: true, sortOrder: 15 },
      { nameAr: "هدير عصام", nameEn: "Hadeer Essam", textAr: "الشقة كانت نضيفة وقريبة من البحر. والرحلات اللي حجزناها معاهم كانت رهيبة. الباقة الشاملة تستاهل كل قرش!", textEn: "The apartment was clean and close to the beach. The trips we booked with them were amazing. The all-inclusive package is worth every penny!", rating: 5, packageName: "all-inclusive", avatar: "هع", isVisible: true, sortOrder: 16 },
      { nameAr: "عبدالرحمن قاسم", nameEn: "Abdulrahman Qasim", textAr: "من أحسن الشركات السياحية في مطروح بدون مجاملة. بيهتموا بكل تفصيلة ومعندكش قلق على حاجة 👍", textEn: "Genuinely one of the best tourism companies in Matruh. They care about every detail and you won't have to worry about anything 👍", rating: 5, packageName: "all-inclusive", avatar: "عق", isVisible: true, sortOrder: 17 },
      { nameAr: "لمياء إبراهيم", nameEn: "Lamia Ibrahim", textAr: "زوجي فاجأني برحلة اليخت وكانت أجمل مفاجأة في حياتي! الغروب من على اليخت ده منظر ماشوفوش في حياتك! 🌅", textEn: "My husband surprised me with a yacht trip and it was the best surprise of my life! The sunset from the yacht is a view you'll never forget! 🌅", rating: 5, packageName: "luxury-yacht", avatar: "لإ", isVisible: true, sortOrder: 18 },
      { nameAr: "شادي المصري", nameEn: "Shady El-Masri", textAr: "الألعاب المائية كانت تحفة خصوصاً الجت سكي. والسفاري في آخر النهار على الرمال كانت تجربة فريدة أوي!", textEn: "The water sports were amazing, especially the jet ski. And the evening safari on the dunes was a truly unique experience!", rating: 5, packageName: "full-safari", avatar: "شم", isVisible: true, sortOrder: 19 },
      { nameAr: "نادين سعد", nameEn: "Nadine Saad", textAr: "حجزت أونلاين وتم التواصل في نفس اليوم. فريق عمل محترم ومنظم. الرحلة كانت فوق التوقعات بكتير! ⭐⭐⭐⭐⭐", textEn: "I booked online and was contacted the same day. A professional and organized team. The trip was way beyond expectations! ⭐⭐⭐⭐⭐", rating: 5, packageName: "all-inclusive", avatar: "نس", isVisible: true, sortOrder: 20 },
      { nameAr: "وليد منصور", nameEn: "Walid Mansour", textAr: "عملت عيد ميلاد أختي على اليخت. كانت مفاجأة ما تتصورش. قالت أحسن عيد ميلاد في حياتها. شكراً يا DR Travel!", textEn: "I celebrated my sister's birthday on the yacht. It was a surprise she could never have imagined. She said it was the best birthday of her life. Thank you DR Travel!", rating: 5, packageName: "luxury-yacht", avatar: "وم", isVisible: true, sortOrder: 21 },
      { nameAr: "إيمان السبكي", nameEn: "Iman El-Sebky", textAr: "كل سنة بنيجي مطروح وبنحجز مع DR Travel مباشرة. ناس موثوقة ومحترفة وأسعار مناسبة. فضلوا كده!", textEn: "Every year we come to Matruh and book directly with DR Travel. Trustworthy, professional, and great prices. Keep it up!", rating: 5, packageName: "all-inclusive", avatar: "إس", isVisible: true, sortOrder: 22 },
    ];
    await db.insert(testimonials).values(realTestimonials as any);
    console.log(`✅  Inserted ${realTestimonials.length} testimonials`);
  } else {
    console.log(`⏭️   Testimonials already exist (${existingTestimonials.length}), skipping`);
  }

  // ─── GALLERY ALBUMS ────────────────────────────────────────────────────────
  console.log("🌱  Seeding gallery albums...");
  const realAlbums = [
    { slug: "luxery",                titleAr: "رحلات يخت فاخره", titleEn: "test",                    descriptionAr: "lelsllll", descriptionEn: "",      coverImage: "",                                                                                                               isVisible: true,  sortOrder: 0 },
    { slug: "test",                  titleAr: "joo",              titleEn: "test",                    descriptionAr: ".....",    descriptionEn: ",,,,",   coverImage: "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2F3549cf6f-169d-4023-99fd-7cfd80f07aff",                    isVisible: true,  sortOrder: 0 },
    { slug: "our-customers-reviews", titleAr: "اراء وتجارب عملائنا ❤️", titleEn: "Our customers' reviews", descriptionAr: "", descriptionEn: "",         coverImage: "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2F0c1a9694-4448-4a17-b75e-7292fa86e8c5",                    isVisible: true,  sortOrder: 1 },
    { slug: "mmm",                   titleAr: "test",             titleEn: "test",                    descriptionAr: "etstt",    descriptionEn: "ss",     coverImage: "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2Fef09b86b-562c-4694-b0da-7f4c260621fd",                    isVisible: false, sortOrder: 0 },
  ];
  for (const album of realAlbums) {
    await db.insert(galleryAlbums).values(album)
      .onConflictDoUpdate({
        target: galleryAlbums.slug,
        set: { titleAr: album.titleAr, titleEn: album.titleEn, coverImage: album.coverImage, isVisible: album.isVisible, sortOrder: album.sortOrder },
      });
  }
  console.log(`✅  Upserted ${realAlbums.length} gallery albums`);

  // ─── GALLERY ITEMS ─────────────────────────────────────────────────────────
  console.log("🌱  Seeding gallery items...");
  const existingItems = await db.select({ id: galleryItems.id }).from(galleryItems);
  if (existingItems.length === 0) {
    // Resolve album IDs by slug
    const albumRows = await db.select({ id: galleryAlbums.id, slug: galleryAlbums.slug }).from(galleryAlbums);
    const albumMap = Object.fromEntries(albumRows.map(r => [r.slug, r.id]));

    const realItems = [
      { albumSlug: "luxery", url: "/api/storage/objects?objectPath=/objects/uploads/389b6ce0-fd28-44db-9f10-ed42bc87f104",                     type: "image", caption: "", sortOrder: 0, size: "wide" },
      { albumSlug: "luxery", url: "/api/storage/objects?objectPath=/objects/uploads/483182c0-c9fa-4b97-be2c-f893eaa6396a",                     type: "image", caption: "", sortOrder: 1, size: "square" },
      { albumSlug: "luxery", url: "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2Fb5abb8c6-e322-49ce-8a58-94b6ab87e7e4",               type: "image", caption: "", sortOrder: 2, size: "normal" },
      { albumSlug: "luxery", url: "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2Ffd284618-351e-43c5-bd77-8bcf01d7d66b",               type: "video", caption: "", sortOrder: 3, size: "normal" },
      { albumSlug: "luxery", url: "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2Ffcda4132-874f-427c-8836-ecaa4651c5a7",               type: "image", caption: "", sortOrder: 4, size: "normal" },
      { albumSlug: "test",   url: "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2Ffd16209e-1520-4320-9774-4ed4f8c421af",               type: "image", caption: "", sortOrder: 0, size: "normal" },
      { albumSlug: "mmm",    url: "/api/storage/objects?objectPath=%2Fobjects%2Fuploads%2F1d623508-db8a-45bb-81af-5bf4af3af642",               type: "image", caption: "", sortOrder: 0, size: "normal" },
    ];

    const itemsToInsert = realItems
      .filter(item => albumMap[item.albumSlug] !== undefined)
      .map(({ albumSlug, ...rest }) => ({ ...rest, albumId: albumMap[albumSlug] }));

    if (itemsToInsert.length > 0) {
      await db.insert(galleryItems).values(itemsToInsert as any);
    }
    console.log(`✅  Inserted ${itemsToInsert.length} gallery items`);
  } else {
    console.log(`⏭️   Gallery items already exist (${existingItems.length}), skipping`);
  }

  // ─── SITE SETTINGS ─────────────────────────────────────────────────────────
  console.log("🌱  Seeding site settings...");
  const realSettings = [
    { key: "whatsapp_number",        value: "201205756024" },
    { key: "phone_number",           value: "+20 120 575 6024" },
    { key: "business_name_ar",       value: "DR Travel" },
    { key: "business_name_en",       value: "DR Travel" },
    { key: "location_ar",            value: "مرسى مطروح، مصر" },
    { key: "location_en",            value: "Marsa Matruh, Egypt" },
    { key: "facebook_url",           value: "https://facebook.com/Drtrave" },
    { key: "instagram_url",          value: "https://instagram.com/drtravel_marsamatrouh" },
    { key: "tiktok_url",             value: "https://tiktok.com/@drtravel.marsa.matrouh" },
    { key: "logo_url",               value: "" },
    { key: "hero_bg_url",            value: "" },
    { key: "hero_title_ar",          value: "اكتشف جمال مرسي مطروح" },
    { key: "hero_title_en",          value: "Discover the Beauty of Marsa Matruh" },
    { key: "hero_title_primary_ar",  value: "اكتشف جمال" },
    { key: "hero_title_primary_en",  value: "Discover the Beauty of" },
    { key: "hero_title_accent_ar",   value: "مرسي مطروح" },
    { key: "hero_title_accent_en",   value: "Marsa Matruh" },
    { key: "hero_subtitle_ar",       value: "سفاري الصحراء · رحلات يخت فاخرة · رياضات مائية · باراشوت · أكوا بارك" },
    { key: "hero_subtitle_en",       value: "Desert Safari · Luxury Yacht Trips · Water Sports · Parasailing · Aqua Park" },
    { key: "default_currency",       value: "EGP" },
    { key: "usd_rate",               value: "50" },
    { key: "sar_rate",               value: "13.3" },
    { key: "show_ai_assistant",      value: "true" },
    { key: "show_compare_feature",   value: "true" },
    { key: "show_testimonials",      value: "true" },
    { key: "reward_enabled",         value: "true" },
    { key: "reward_type",            value: "percentage" },
    { key: "reward_value",           value: "5" },
    { key: "reward_after_x",         value: "1" },
    { key: "reward_description_ar",  value: "" },
    { key: "reward_description_en",  value: "" },
  ];
  for (const setting of realSettings) {
    await db.insert(siteSettings).values(setting)
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: setting.value },
      });
  }
  console.log(`✅  Upserted ${realSettings.length} site settings`);

  console.log("🎉  Full data seed complete");
  process.exit(0);
}

main().catch(err => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
