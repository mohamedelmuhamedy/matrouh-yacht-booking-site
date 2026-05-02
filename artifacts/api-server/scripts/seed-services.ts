#!/usr/bin/env tsx
/**
 * Idempotent seed for the 8 default services pulled from the Arabic translations.
 * Uses onConflictDoNothing on slug so admin edits made later are preserved.
 */
import { db, services } from "@workspace/db";

const DEFAULTS = [
  {
    slug: "desert-safari",
    icon: "🏜️",
    titleAr: "سفاري صحراوية",
    titleEn: "Desert Safari",
    descriptionAr: "مغامرة لا تُنسى في صحراء مطروح الذهبية مع مرشدين محترفين",
    descriptionEn: "An unforgettable adventure in Marsa Matrouh's golden desert with professional guides",
    longDescriptionAr: "انطلق في رحلة سفاري مثيرة وسط رمال مطروح الذهبية على متن سيارات دفع رباعي حديثة. استمتع بمشاهدة غروب الشمس من أعلى الكثبان الرملية، وتذوق الشاي البدوي الأصيل في خيمة عربية تقليدية، مع مرشدين محترفين يعرفون كل تفاصيل الصحراء.",
    longDescriptionEn: "Embark on an exciting safari through Matrouh's golden sands aboard modern 4x4 vehicles. Enjoy watching the sunset from atop the dunes and sip authentic Bedouin tea in a traditional Arabic tent, all with professional guides who know every detail of the desert.",
    color: "#C9A84C", // brand gold (sand)
    featuresAr: ["سيارات دفع رباعي حديثة", "مرشدين محترفين", "شاي بدوي أصيل", "تصوير احترافي"],
    featuresEn: ["Modern 4x4 vehicles", "Professional guides", "Authentic Bedouin tea", "Professional photography"],
    sortOrder: 1,
  },
  {
    slug: "yacht-trips",
    icon: "🚢",
    titleAr: "رحلات يخت",
    titleEn: "Yacht Trips",
    descriptionAr: "إبحر على متن يخت فاخر وشاهد جمال البحر المتوسط من أجمل زاوية",
    descriptionEn: "Sail on a luxury yacht and see the Mediterranean from its most beautiful angle",
    longDescriptionAr: "تجربة بحرية فاخرة على متن يخت مجهز بأحدث وسائل الراحة. استمتع بالإبحار في مياه البحر المتوسط الصافية، السباحة في خلجان منعزلة، ومشاهدة الدلافين عن قرب. مثالية للمناسبات الخاصة وأعياد الميلاد.",
    longDescriptionEn: "A luxury sea experience aboard a fully-equipped yacht. Enjoy sailing on crystal Mediterranean waters, swimming in secluded bays, and watching dolphins up close. Perfect for special occasions and birthdays.",
    color: "#00AAFF", // brand ocean blue
    featuresAr: ["يخت فاخر مكيّف", "مشروبات ووجبات خفيفة", "معدات سباحة وغطس", "كابتن خبير"],
    featuresEn: ["Luxury air-conditioned yacht", "Drinks and snacks", "Swim & snorkel gear", "Expert captain"],
    sortOrder: 2,
  },
  {
    slug: "water-sports",
    icon: "🌊",
    titleAr: "ألعاب مائية",
    titleEn: "Water Sports",
    descriptionAr: "إثارة وتشويق لا حدود لهما على أجمل شواطئ مطروح",
    descriptionEn: "Endless thrill and excitement on Matrouh's most beautiful beaches",
    longDescriptionAr: "تشكيلة واسعة من الألعاب المائية المثيرة على شواطئ مطروح الفيروزية. جرّب الجت سكي، الموز العائم، الدوناتس، والـ Fly Board. كل المعدات حديثة ومُختبرة، مع طاقم إنقاذ متخصص لضمان أعلى درجات الأمان.",
    longDescriptionEn: "A wide range of thrilling water sports on Matrouh's turquoise beaches. Try jet skiing, banana boat, donut rides, and Fly Board. All equipment is new and tested, with a specialized rescue team to ensure top safety.",
    color: "#06B6D4", // teal — close to ocean family
    featuresAr: ["جت سكي", "موز عائم ودوناتس", "Fly Board", "طاقم إنقاذ متخصص"],
    featuresEn: ["Jet ski", "Banana boat & donuts", "Fly Board", "Specialized rescue team"],
    sortOrder: 3,
  },
  {
    slug: "parasailing",
    icon: "🪂",
    titleAr: "براشوت",
    titleEn: "Parasailing",
    descriptionAr: "حلق فوق البحر وشاهد مطروح من الأعلى بمنظر يأخذ الأنفاس",
    descriptionEn: "Soar above the sea and see Matrouh from above in a breathtaking view",
    longDescriptionAr: "تجربة طيران لا تُنسى! حلّق على ارتفاع يصل إلى ١٥٠ متراً فوق سطح البحر مع منظر بانورامي خلاب لساحل مطروح. مناسبة لكل الأعمار من ١٠ سنوات فأكثر، مع مدربين معتمدين دولياً.",
    longDescriptionEn: "An unforgettable flying experience! Soar up to 150 meters above sea level with a stunning panoramic view of Matrouh's coast. Suitable for all ages 10+ with internationally certified instructors.",
    color: "#4A90C2", // soft sky blue
    featuresAr: ["ارتفاع يصل إلى ١٥٠ متر", "مدربين معتمدين دولياً", "معدات أمان حديثة", "تصوير من الجو"],
    featuresEn: ["Heights up to 150m", "Internationally certified instructors", "Modern safety equipment", "Aerial photography"],
    sortOrder: 4,
  },
  {
    slug: "aqua-park",
    icon: "🎡",
    titleAr: "أكوا بارك",
    titleEn: "Aqua Park",
    descriptionAr: "مرح لا نهاية له للعائلات والأطفال في مدينة الألعاب المائية",
    descriptionEn: "Endless fun for families and kids in the water games city",
    longDescriptionAr: "أكبر أكوا بارك في مرسى مطروح بأكثر من ٢٠ زحليقة مائية متنوعة لكل الأعمار. مناطق آمنة للأطفال، مطاعم، كافيهات، وغرف تبديل ملابس. يوم كامل من المرح المضمون للعائلة بأكملها.",
    longDescriptionEn: "The largest aqua park in Marsa Matrouh with over 20 varied water slides for all ages. Safe kids' zones, restaurants, cafés, and changing rooms. A full day of guaranteed fun for the whole family.",
    color: "#1FB6D8", // bright aqua cyan
    featuresAr: ["+٢٠ زحليقة مائية", "منطقة أطفال آمنة", "مطاعم وكافيهات", "غرف تبديل وحفظ أمتعة"],
    featuresEn: ["20+ water slides", "Safe kids zone", "Restaurants & cafés", "Changing rooms & lockers"],
    sortOrder: 5,
  },
  {
    slug: "apartments",
    icon: "🏠",
    titleAr: "شقق للإيجار",
    titleEn: "Apartments for Rent",
    descriptionAr: "إقامة مريحة وفاخرة بأسعار تناسب جميع الميزانيات",
    descriptionEn: "Comfortable and luxurious stays at prices that fit every budget",
    longDescriptionAr: "تشكيلة واسعة من الشقق المفروشة في أفضل مواقع مطروح، قريبة من البحر والمولات. مكيّفة بالكامل، نظيفة، ومجهزة بكل ما تحتاجه إقامتك. خصومات للحجوزات الطويلة وللمجموعات.",
    longDescriptionEn: "A wide selection of furnished apartments in Matrouh's best locations, close to the beach and malls. Fully air-conditioned, clean, and equipped with everything you need. Discounts for long stays and groups.",
    color: "#B8924A", // warm gold
    featuresAr: ["مكيفة بالكامل", "قريبة من البحر", "نظيفة ومجهزة", "خصومات للمجموعات"],
    featuresEn: ["Fully air-conditioned", "Close to the beach", "Clean & equipped", "Group discounts"],
    sortOrder: 6,
  },
  {
    slug: "safety-equipment",
    icon: "🛟",
    titleAr: "تجهيزات أمان كاملة",
    titleEn: "Full Safety Equipment",
    descriptionAr: "معدات أمان ومتابعة مستمرة عشان تستمتع بكل نشاط وأنت مطمئن",
    descriptionEn: "Safety equipment and constant supervision so you can enjoy every activity worry-free",
    longDescriptionAr: "أمانك أولويتنا. كل رحلاتنا وأنشطتنا مجهزة بأحدث معدات الأمان: سترات نجاة معتمدة، طاقم إسعاف، وسائل اتصال مع الإنقاذ، وتأمين كامل ضد الحوادث. نحن لا نساوم على سلامة عملائنا.",
    longDescriptionEn: "Your safety is our priority. All our trips and activities are equipped with the latest safety gear: certified life vests, first-aid team, rescue communications, and full accident insurance. We never compromise on customer safety.",
    color: "#5B8DBF", // steel blue
    featuresAr: ["سترات نجاة معتمدة", "طاقم إسعاف جاهز", "تأمين ضد الحوادث", "اتصال مباشر مع الإنقاذ"],
    featuresEn: ["Certified life vests", "Ready first-aid team", "Accident insurance", "Direct rescue link"],
    sortOrder: 7,
  },
  {
    slug: "private-events",
    icon: "🎉",
    titleAr: "رحلات ومناسبات خاصة",
    titleEn: "Private Trips & Events",
    descriptionAr: "تنظيم خروجات للمجموعات وأعياد الميلاد والاحتفالات بتفاصيل تناسبك",
    descriptionEn: "Organizing group outings, birthdays, and celebrations tailored to your needs",
    longDescriptionAr: "نُنظّم لك رحلتك الخاصة من الألف للياء حسب طلباتك وميزانيتك. أعياد ميلاد على اليخت، خطوبة على الشاطئ، رحلات شركات، أو خروجات عائلية كبيرة. كل التفاصيل تحت إشراف فريقنا المتخصص.",
    longDescriptionEn: "We organize your private trip from A to Z according to your wishes and budget. Birthdays on a yacht, beach engagements, corporate retreats, or large family outings. Every detail is handled by our specialized team.",
    color: "#C9A84C", // brand gold
    featuresAr: ["تنظيم كامل للحدث", "تنسيق ديكور وتصوير", "كاترينج ومأكولات", "DJ وموسيقى"],
    featuresEn: ["Full event planning", "Decor & photography coordination", "Catering & food", "DJ & music"],
    sortOrder: 8,
  },
];

async function main() {
  console.log("🌱  Seeding services...");
  let inserted = 0;
  for (const svc of DEFAULTS) {
    const result = await db.insert(services).values(svc).onConflictDoNothing({ target: services.slug }).returning();
    if (result.length > 0) inserted++;
  }
  console.log(`✅  Done. Inserted ${inserted} new services (existing ones preserved).`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
