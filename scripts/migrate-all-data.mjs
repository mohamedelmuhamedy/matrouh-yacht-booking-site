#!/usr/bin/env node
/**
 * DR Travel — Full Data Migration Script
 * Syncs all real production data (packages, testimonials, settings) to DB.
 * Run: node scripts/migrate-all-data.mjs
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pg = require("/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules/pg");
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ============================================================
// 1. PACKAGES — full data from packages.ts
// ============================================================
const PACKAGES = [
  {
    id: 1, slug: "full-safari", icon: "🏜️",
    title_ar: "باقة السفاري الكاملة", title_en: "Full Safari Package",
    description_ar: "انطلق في مغامرة صحراوية لا تُنسى وسط رمال مطروح الذهبية",
    description_en: "Embark on an unforgettable desert adventure across the golden sands of Matruh",
    long_description_ar: "تجربة السفاري الصحراوية في مرسى مطروح هي واحدة من أكثر التجارب إثارةً على الساحل الشمالي. ستنطلق مع فريقنا المحترف عبر الكثبان الرملية الذهبية، تستمتع بأجواء الصحراء الساحرة وتعيش لحظات لا تُنسى من الإثارة والمغامرة. الباقة تشمل تجربة براشوت فوق البحر الأبيض المتوسط وغداء مصري أصيل يجمعك بأجواء التراث المحلي.",
    long_description_en: "The desert safari experience in Marsa Matruh is one of the most thrilling adventures on the North Coast. You'll set out with our professional team across golden sand dunes, enjoying the magical desert atmosphere and living unforgettable moments of excitement and adventure. The package includes a parasailing experience over the Mediterranean Sea and an authentic Egyptian lunch that connects you with local heritage.",
    category: "safari", price_egp: 350, max_price_egp: 500,
    duration_ar: "يوم كامل — ٨ ساعات", duration_en: "Full Day — 8 Hours",
    color: "#C9A84C", badge_ar: "الأكثر طلباً", badge_en: "Most Popular", badge_color: "#C9A84C",
    featured: true, popular: true, family_friendly: true, foreigner_friendly: true, children_friendly: true,
    experience_level: "moderate", rating: 4.9, review_count: 312,
    images: [
      "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200&q=80",
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80",
      "https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=1200&q=80",
    ],
    includes_ar: ["سفاري صحراوية ممتعة بالسيارات", "تجربة براشوت مثيرة فوق البحر", "غداء مصري أصيل", "مرشد سياحي خبير", "مياه ومشروبات طوال الرحلة", "تصوير احترافي"],
    includes_en: ["Exciting desert safari by 4WD", "Parasailing experience over the sea", "Authentic Egyptian lunch", "Expert tour guide", "Water & beverages throughout", "Professional photography"],
    excludes_ar: ["المواصلات من وإلى الفندق", "تأمين السفر", "المصاريف الشخصية"],
    excludes_en: ["Hotel transfers", "Travel insurance", "Personal expenses"],
    itinerary_ar: [
      { title: "٩:٠٠ ص — الانطلاق", desc: "التجمع في نقطة الانطلاق وتقديم الفريق والتعليمات" },
      { title: "١٠:٠٠ ص — السفاري", desc: "جولة مثيرة بالسيارات في الكثبان الرملية والواحات الطبيعية" },
      { title: "١:٠٠ م — الغداء", desc: "وجبة غداء مصرية أصيلة في قلب الصحراء" },
      { title: "٢:٣٠ م — البراشوت", desc: "تجربة البراشوت فوق البحر الأبيض المتوسط بمنظر خيالي" },
      { title: "٤:٣٠ م — العودة", desc: "العودة مع الذكريات الجميلة والصور المميزة" },
    ],
    itinerary_en: [
      { title: "9:00 AM — Departure", desc: "Meet at starting point, team introduction and safety briefing" },
      { title: "10:00 AM — Safari", desc: "Exciting 4WD ride through sand dunes and natural oases" },
      { title: "1:00 PM — Lunch", desc: "Authentic Egyptian lunch meal in the heart of the desert" },
      { title: "2:30 PM — Parasailing", desc: "Parasailing experience over the Mediterranean with breathtaking views" },
      { title: "4:30 PM — Return", desc: "Return with beautiful memories and amazing photos" },
    ],
    why_this_trip_ar: [
      { icon: "🏆", text: "الأكثر طلباً من بين جميع باقاتنا" },
      { icon: "👨‍👩‍👧‍👦", text: "مناسبة للعائلات والأطفال من جميع الأعمار" },
      { icon: "💰", text: "أفضل قيمة مقابل السعر" },
      { icon: "🌍", text: "مناسبة للزوار الأجانب مع مرشد يتحدث الإنجليزية" },
      { icon: "📸", text: "تجربة فوتوغرافية استثنائية" },
    ],
    why_this_trip_en: [
      { icon: "🏆", text: "Our most booked package by far" },
      { icon: "👨‍👩‍👧‍👦", text: "Suitable for families & children of all ages" },
      { icon: "💰", text: "Best value for money" },
      { icon: "🌍", text: "Great for foreign visitors with English-speaking guide" },
      { icon: "📸", text: "An exceptional photography experience" },
    ],
    suitable_for: ["families", "foreigners", "couples", "groups"],
    what_to_bring_ar: ["ملابس مريحة", "واقي شمس", "نظارات شمسية", "كاميرا", "مياه إضافية"],
    what_to_bring_en: ["Comfortable clothes", "Sunscreen", "Sunglasses", "Camera", "Extra water"],
    cancellation_ar: "إلغاء مجاني حتى ٢٤ ساعة قبل الرحلة. الإلغاء بعد ٢٤ ساعة يستلزم دفع ٥٠٪ من قيمة الحجز.",
    cancellation_en: "Free cancellation up to 24 hours before the trip. Cancellation within 24 hours requires 50% of booking value.",
    faq: [
      { questionAr: "هل السفاري آمنة للأطفال؟", questionEn: "Is the safari safe for children?", answerAr: "نعم، سياراتنا مجهزة بالكامل لسلامة الأطفال ومرشدونا متخصصون في الرحلات العائلية.", answerEn: "Yes, our vehicles are fully equipped for child safety and our guides specialize in family trips." },
      { questionAr: "ما الملابس المناسبة؟", questionEn: "What clothes are appropriate?", answerAr: "ننصح بملابس مريحة وخفيفة اللون مع حذاء مريح وواقي شمس قوي.", answerEn: "We recommend comfortable, light-colored clothing with comfortable shoes and strong sunscreen." },
      { questionAr: "هل توجد مواصلات؟", questionEn: "Is there transportation?", answerAr: "يمكن ترتيب المواصلات بتكلفة إضافية. تواصل معنا للتفاصيل.", answerEn: "Transportation can be arranged for an additional cost. Contact us for details." },
    ],
    similar_ids: [2, 3],
    includes_meals: true, includes_transport: false, includes_accommodation: false,
    min_group_size: 1, max_group_size: 20, status: "published", active: true, sort_order: 1,
  },
  {
    id: 2, slug: "luxury-yacht", icon: "🚢",
    title_ar: "باقة اليخت الفاخر", title_en: "Luxury Yacht Package",
    description_ar: "أبحر على متن يخت فاخر وشاهد جمال البحر المتوسط",
    description_en: "Sail aboard a luxury yacht and discover the beauty of the Mediterranean Sea",
    long_description_ar: "تجربة اليخت مع DR Travel هي رحلة بحرية فاخرة لن تنساها. ستبحر على متن يخت حديث ومجهز بالكامل عبر المياه الزرقاء الصافية للبحر المتوسط، مع إمكانية السباحة والغطس وممارسة الألعاب المائية. الرحلة تشمل وجبة خفيفة على المتن وجلسة تصوير احترافية لتوثيق هذه اللحظات الاستثنائية.",
    long_description_en: "The yacht experience with DR Travel is a luxury sea voyage you'll never forget. You'll sail on a modern, fully-equipped yacht through the crystal-clear blue waters of the Mediterranean, with the possibility of swimming, diving, and water sports. The trip includes a light meal on board and a professional photography session to document these exceptional moments.",
    category: "yacht", price_egp: 500, max_price_egp: 700,
    duration_ar: "٤ ساعات", duration_en: "4 Hours",
    color: "#00AAFF", badge_ar: null, badge_en: null, badge_color: null,
    featured: false, popular: true, family_friendly: false, foreigner_friendly: true, children_friendly: false,
    experience_level: "easy", rating: 4.8, review_count: 189,
    images: [
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
      "https://images.unsplash.com/photo-1545208018-a4b7bfeba8e4?w=1200&q=80",
    ],
    includes_ar: ["رحلة يخت بحرية فاخرة", "ألعاب مائية متنوعة", "وجبة خفيفة على المتن", "تصوير احترافي", "معدات الغطس والسباحة"],
    includes_en: ["Luxury sea yacht ride", "Variety of water sports", "Light meal on board", "Professional photography", "Diving & swimming equipment"],
    excludes_ar: ["المواصلات", "الوجبات الكاملة", "المشروبات الكحولية"],
    excludes_en: ["Transportation", "Full meals", "Alcoholic beverages"],
    itinerary_ar: [
      { title: "٢:٠٠ م — الصعود", desc: "الترحيب بالضيوف على متن اليخت وشرح قواعد السلامة" },
      { title: "٢:٣٠ م — الإبحار", desc: "الانطلاق نحو أجمل مناطق البحر المتوسط" },
      { title: "٣:٣٠ م — ألعاب مائية", desc: "السباحة والألعاب المائية في المياه الزرقاء الصافية" },
      { title: "٤:٣٠ م — الوجبة الخفيفة", desc: "استمتع بوجبة خفيفة لذيذة وأنت تشاهد أفق البحر" },
      { title: "٦:٠٠ م — العودة", desc: "العودة إلى الشاطئ مع مشاهدة غروب الشمس الخلاب" },
    ],
    itinerary_en: [
      { title: "2:00 PM — Boarding", desc: "Welcome guests on board and safety briefing" },
      { title: "2:30 PM — Setting Sail", desc: "Depart toward the most beautiful Mediterranean spots" },
      { title: "3:30 PM — Water Sports", desc: "Swimming and water sports in crystal-clear blue waters" },
      { title: "4:30 PM — Light Meal", desc: "Enjoy a delicious light meal while watching the sea horizon" },
      { title: "6:00 PM — Return", desc: "Return to shore with a breathtaking sunset view" },
    ],
    why_this_trip_ar: [
      { icon: "🌅", text: "منظر الغروب من على اليخت لا مثيل له" },
      { icon: "💑", text: "مثالية للأزواج والمجموعات" },
      { icon: "🌊", text: "مياه المتوسط الصافية للغطس والسباحة" },
      { icon: "🌍", text: "الأكثر طلباً من الزوار الأجانب" },
      { icon: "📸", text: "صور احترافية على المتن" },
    ],
    why_this_trip_en: [
      { icon: "🌅", text: "The sunset view from the yacht is unmatched" },
      { icon: "💑", text: "Perfect for couples and groups" },
      { icon: "🌊", text: "Crystal clear Mediterranean waters for diving & swimming" },
      { icon: "🌍", text: "Most requested by foreign visitors" },
      { icon: "📸", text: "Professional photos on board" },
    ],
    suitable_for: ["couples", "foreigners", "groups", "friends"],
    what_to_bring_ar: ["ملابس السباحة", "منشفة", "واقي شمس مقاوم للماء", "نظارات شمسية", "ملابس للتغيير"],
    what_to_bring_en: ["Swimwear", "Towel", "Waterproof sunscreen", "Sunglasses", "Change of clothes"],
    cancellation_ar: "إلغاء مجاني حتى ٤٨ ساعة قبل الرحلة. لا يوجد رد للمبلغ بعد ذلك.",
    cancellation_en: "Free cancellation up to 48 hours before the trip. No refund after that.",
    faq: [
      { questionAr: "هل الرحلة مناسبة لمن لا يجيد السباحة؟", questionEn: "Is the trip suitable for non-swimmers?", answerAr: "نعم! تتوفر سترات النجاة والمعدات اللازمة للجميع.", answerEn: "Yes! Life jackets and necessary equipment are provided for everyone." },
      { questionAr: "ما الحد الأدنى لعدد الأشخاص؟", questionEn: "What's the minimum group size?", answerAr: "الحد الأدنى شخصان. يمكن حجز رحلة خاصة.", answerEn: "Minimum 2 persons. Private trips can be arranged." },
    ],
    similar_ids: [1, 3],
    includes_meals: true, includes_transport: false, includes_accommodation: false,
    min_group_size: 2, max_group_size: 15, status: "published", active: true, sort_order: 2,
  },
  {
    id: 3, slug: "all-inclusive", icon: "⭐",
    title_ar: "الباقة الشاملة", title_en: "All-Inclusive Package",
    description_ar: "تجربة متكاملة تجمع كل ما تحبه في مكان واحد",
    description_en: "A complete experience combining everything you love in one place",
    long_description_ar: "الباقة الشاملة هي تاج باقاتنا — تجمع بين جمال الصحراء وروعة البحر وإقامة فندقية مريحة في تجربة واحدة استثنائية. مناسبة للباحثين عن تجربة مطروح الكاملة بدون تعب الترتيب والتخطيط. فريقنا يتولى كل شيء لتعيش أفضل إجازة في حياتك.",
    long_description_en: "The All-Inclusive package is the crown of our offerings — combining desert beauty, sea magnificence, and comfortable hotel accommodation in one exceptional experience. Perfect for those seeking the complete Matruh experience without the hassle of planning. Our team handles everything so you can enjoy the best vacation of your life.",
    category: "complete", price_egp: 1200, max_price_egp: 1800,
    duration_ar: "يومان — ليلة واحدة", duration_en: "2 Days — 1 Night",
    color: "#A855F7", badge_ar: "قيمة استثنائية", badge_en: "Exceptional Value", badge_color: "#00AAFF",
    featured: false, popular: false, family_friendly: true, foreigner_friendly: true, children_friendly: true,
    experience_level: "easy", rating: 4.9, review_count: 97,
    images: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
      "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200&q=80",
    ],
    includes_ar: ["سفاري صحراوية كاملة", "رحلة يخت فاخرة", "أكوا بارك يوم كامل", "إقامة ليلة فندقية", "جميع الوجبات", "مرشد سياحي خاص"],
    includes_en: ["Full desert safari", "Luxury yacht trip", "Full-day aqua park", "One-night hotel stay", "All meals included", "Private tour guide"],
    excludes_ar: ["المصاريف الشخصية", "تأمين السفر"],
    excludes_en: ["Personal expenses", "Travel insurance"],
    itinerary_ar: [
      { title: "اليوم الأول — ٩:٠٠ ص", desc: "الوصول ورحلة السفاري الصحراوية والغداء" },
      { title: "اليوم الأول — ٢:٠٠ م", desc: "رحلة اليخت وألعاب مائية وغروب الشمس" },
      { title: "اليوم الأول — الليل", desc: "إقامة فندقية مريحة وعشاء خاص" },
      { title: "اليوم الثاني — ١٠:٠٠ ص", desc: "أكوا بارك ومرح لا نهاية له للعائلة" },
      { title: "اليوم الثاني — ٤:٠٠ م", desc: "توديع مع أجمل الذكريات" },
    ],
    itinerary_en: [
      { title: "Day 1 — 9:00 AM", desc: "Arrival, desert safari, and lunch" },
      { title: "Day 1 — 2:00 PM", desc: "Yacht trip, water sports, and sunset" },
      { title: "Day 1 — Evening", desc: "Comfortable hotel stay and private dinner" },
      { title: "Day 2 — 10:00 AM", desc: "Aqua park and unlimited family fun" },
      { title: "Day 2 — 4:00 PM", desc: "Farewell with the most beautiful memories" },
    ],
    why_this_trip_ar: [
      { icon: "⭐", text: "تجمع كل تجارب مطروح في باقة واحدة" },
      { icon: "💰", text: "أوفر من حجز كل نشاط منفرداً بـ ٤٠٪" },
      { icon: "🏨", text: "إقامة فندقية مريحة شاملة" },
      { icon: "🎯", text: "مناسبة للزيارات الممتدة لمطروح" },
      { icon: "👨‍👩‍👧‍👦", text: "مثالية للعائلات والمجموعات الكبيرة" },
    ],
    why_this_trip_en: [
      { icon: "⭐", text: "Combines all Matruh experiences in one package" },
      { icon: "💰", text: "40% cheaper than booking each activity separately" },
      { icon: "🏨", text: "Comfortable hotel accommodation included" },
      { icon: "🎯", text: "Ideal for extended Matruh visits" },
      { icon: "👨‍👩‍👧‍👦", text: "Perfect for families and large groups" },
    ],
    suitable_for: ["families", "couples", "foreigners", "groups"],
    what_to_bring_ar: ["ملابس لليومين", "ملابس السباحة", "واقي شمس", "كاميرا", "وثائق الهوية"],
    what_to_bring_en: ["Clothes for 2 days", "Swimwear", "Sunscreen", "Camera", "ID documents"],
    cancellation_ar: "إلغاء مجاني حتى ٧٢ ساعة قبل الرحلة. خصم ٣٠٪ للإلغاء بين ٧٢–٢٤ ساعة. بعد ٢٤ ساعة لا يوجد رد.",
    cancellation_en: "Free cancellation 72 hours before. 30% fee for 72–24 hour cancellations. No refund within 24 hours.",
    faq: [
      { questionAr: "هل يمكن تعديل البرنامج؟", questionEn: "Can the itinerary be modified?", answerAr: "نعم، يمكن تخصيص البرنامج جزئياً حسب طلبك. تواصل معنا.", answerEn: "Yes, the program can be partially customized on request. Contact us." },
      { questionAr: "ما مستوى الفندق؟", questionEn: "What's the hotel level?", answerAr: "فنادق ٣-٤ نجوم. يمكن الترقية لـ ٥ نجوم بتكلفة إضافية.", answerEn: "3-4 star hotels. Upgrade to 5 stars available for additional cost." },
    ],
    similar_ids: [1, 2, 4],
    includes_meals: true, includes_transport: true, includes_accommodation: true,
    min_group_size: 1, max_group_size: 30, status: "published", active: true, sort_order: 3,
  },
  {
    id: 4, slug: "family-package", icon: "👨‍👩‍👧‍👦",
    title_ar: "باقة العائلة", title_en: "Family Package",
    description_ar: "متعة بلا حدود للعائلة كاملها كبيرها وصغيرها",
    description_en: "Unlimited fun for the whole family — young and old alike",
    long_description_ar: "باقة العائلة مصممة بعناية لتوفير أقصى قدر من المتعة والأمان لجميع أفراد العائلة. من الألعاب المائية المناسبة للأطفال إلى السفاري الهادئة للكبار، نضمن أن يعود كل فرد بذكريات جميلة لا تُنسى. فريقنا متدرب خصيصاً للتعامل مع الأسرة والأطفال بأمان واحترافية تامة.",
    long_description_en: "The Family Package is carefully designed to provide maximum fun and safety for all family members. From water activities suitable for children to peaceful safaris for adults, we ensure everyone returns with unforgettable memories. Our team is specially trained to handle families and children with complete safety and professionalism.",
    category: "family", price_egp: 1000, max_price_egp: 1400,
    duration_ar: "يوم كامل", duration_en: "Full Day",
    color: "#25D366", badge_ar: null, badge_en: null, badge_color: null,
    featured: false, popular: false, family_friendly: true, foreigner_friendly: false, children_friendly: true,
    experience_level: "easy", rating: 4.8, review_count: 156,
    images: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80",
      "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
    ],
    includes_ar: ["سفاري عائلية آمنة ومرحة", "ألعاب مائية للأطفال والكبار", "أكوا بارك يوم كامل", "وجبة غداء عائلية", "مرشد متخصص في الرحلات العائلية"],
    includes_en: ["Safe & fun family safari", "Water activities for kids & adults", "Full-day aqua park", "Family lunch", "Guide specialized in family trips"],
    excludes_ar: ["المواصلات", "التذاكر الإضافية بالأكوا بارك"],
    excludes_en: ["Transportation", "Extra aqua park tickets"],
    itinerary_ar: [
      { title: "٩:٠٠ ص — انطلاق العائلة", desc: "التجمع والتعارف والتهيئة لرحلة مميزة" },
      { title: "١٠:٠٠ ص — السفاري العائلية", desc: "جولة هادئة وآمنة في الصحراء مناسبة للأطفال والكبار" },
      { title: "١٢:٠٠ م — الغداء", desc: "وجبة عائلية دافئة بأجواء احتفالية" },
      { title: "١:٠٠ م — الأكوا بارك", desc: "مرح بلا حدود في أكوا بارك مطروح" },
      { title: "٤:٠٠ م — نهاية مبهجة", desc: "صور عائلية جماعية وذكريات لا تُنسى" },
    ],
    itinerary_en: [
      { title: "9:00 AM — Family Kick-off", desc: "Gather, meet the team, and get ready for a special day" },
      { title: "10:00 AM — Family Safari", desc: "Calm and safe desert tour suitable for kids and adults" },
      { title: "12:00 PM — Lunch", desc: "Warm family meal in a festive atmosphere" },
      { title: "1:00 PM — Aqua Park", desc: "Unlimited fun at Matruh Aqua Park" },
      { title: "4:00 PM — Grand Finale", desc: "Group family photos and unforgettable memories" },
    ],
    why_this_trip_ar: [
      { icon: "👶", text: "آمنة ١٠٠٪ للأطفال من جميع الأعمار" },
      { icon: "👨‍👩‍👧‍👦", text: "الأنسب للعائلات المصرية" },
      { icon: "🎡", text: "تشمل أكوا بارك كامل" },
      { icon: "💰", text: "سعر خاص لـ٤ أفراد" },
      { icon: "😊", text: "أعلى نسبة رضا من العملاء" },
    ],
    why_this_trip_en: [
      { icon: "👶", text: "100% safe for children of all ages" },
      { icon: "👨‍👩‍👧‍👦", text: "Most suitable for Egyptian families" },
      { icon: "🎡", text: "Includes full aqua park access" },
      { icon: "💰", text: "Special price for 4 people" },
      { icon: "😊", text: "Highest customer satisfaction rate" },
    ],
    suitable_for: ["families", "children"],
    what_to_bring_ar: ["ملابس مريحة للأطفال", "واقي شمس للأطفال", "ملابس سباحة", "ألعاب الأطفال الصغار", "وثائق الهوية"],
    what_to_bring_en: ["Comfortable children's clothes", "Children's sunscreen", "Swimwear", "Small toys for young children", "ID documents"],
    cancellation_ar: "إلغاء مجاني حتى ٢٤ ساعة قبل الرحلة.",
    cancellation_en: "Free cancellation up to 24 hours before the trip.",
    faq: [
      { questionAr: "ما الحد الأدنى لعمر الطفل؟", questionEn: "What's the minimum child age?", answerAr: "لا يوجد حد أدنى. نوفر معدات خاصة للأطفال الرضع.", answerEn: "No minimum age. We provide special equipment for infants." },
      { questionAr: "هل الرحلة مجهدة للأطفال الصغار؟", questionEn: "Is the trip tiring for young children?", answerAr: "لا. البرنامج مُصمم خصيصاً بأنشطة هادئة ومتدرجة تناسب الأطفال.", answerEn: "No. The program is specially designed with calm, gradual activities suitable for children." },
    ],
    similar_ids: [1, 3],
    includes_meals: true, includes_transport: false, includes_accommodation: false,
    min_group_size: 2, max_group_size: 25, status: "published", active: true, sort_order: 4,
  },
];

// ============================================================
// 2. TESTIMONIALS — 21 real reviews from translations
// ============================================================
const TESTIMONIALS = [
  { name_ar: "أحمد الشيخ", name_en: "Ahmed El-Sheikh", text_ar: "والله تجربة من التحفة! السفاري كانت خيال وناس DR Travel محترمين جداً وشاطرين. هنرجع تاني متأكد 💯", text_en: "An amazing experience! The safari was incredible and the DR Travel team was very professional. We'll definitely be back 💯", rating: 5, avatar: "أش", package_name: "full-safari" },
  { name_ar: "فاطمة سمير", name_en: "Fatma Samir", text_ar: "اليخت كان حلم بجد! المنظر من البحر ماشفتوش في حياتي. الخدمة تمام والأسعار معقولة جداً. شكراً يا DR Travel!", text_en: "The yacht was truly a dream! The view from the sea was unlike anything I've seen. Great service and very reasonable prices. Thank you DR Travel!", rating: 5, avatar: "فس", package_name: "luxury-yacht" },
  { name_ar: "محمد ربيع", name_en: "Mohamed Rabie", text_ar: "صحابي وأنا رحنا على باقة السفاري وكانت أحلى يوم في الصيف ده. البراشوت فوق البحر حاجة مش طبيعية أوي 🔥", text_en: "My friends and I did the safari package and it was the best day of this summer. Parasailing over the sea was an absolutely insane experience 🔥", rating: 5, avatar: "مر", package_name: "full-safari" },
  { name_ar: "نورهان طارق", name_en: "Nourhan Tarek", text_ar: "أخدت الباقة الشاملة مع عيلتي والعيال فرحوا جداً. الأكوا بارك كان تحفة والتعامل ممتاز من أول لآخر.", text_en: "I took the all-inclusive package with my family and the kids had a blast. The aqua park was amazing and the service was excellent from start to finish.", rating: 5, avatar: "نط", package_name: "all-inclusive" },
  { name_ar: "كريم الجمل", name_en: "Karim El-Gamal", text_ar: "أول مرة أروح مطروح وبقوا عاملين الحجة ليها. السفاري والألعاب المائية في يوم واحد؟ جامدين بجد!", text_en: "First time in Matruh and they made me fall in love with it. Safari and water sports in one day? Absolutely brilliant!", rating: 5, avatar: "كج", package_name: "full-safari" },
  { name_ar: "سلمى حسن", name_en: "Salma Hassan", text_ar: "خدمة على مستوى عالي جداً. الواتساب بيردوا في الحال وبيشرحوا كل حاجة بالتفصيل. الرحلة عدت تمام تمام 🌊", text_en: "Very high level of service. They respond on WhatsApp immediately and explain everything in detail. The trip went perfectly 🌊", rating: 5, avatar: "سح", package_name: "luxury-yacht" },
  { name_ar: "عمرو فتحي", name_en: "Amr Fathy", text_ar: "عملت مفاجأة لمراتي وأخدناها على اليخت. كانت أجمل مفاجأة في حياتها! شكراً للفريق على التنظيم الرائع.", text_en: "I surprised my wife with a yacht trip. It was the best surprise of her life! Thank you to the team for the wonderful organization.", rating: 5, avatar: "عف", package_name: "luxury-yacht" },
  { name_ar: "دينا البسيوني", name_en: "Dina El-Bassiouny", text_ar: "البحر في مطروح مختلف عن أي حاجة تانية. وركوب اليخت مع DR Travel زاد الموضوع جمال. هنفضل نيجي كل سنة!", text_en: "The sea in Matruh is different from anything else. Sailing with DR Travel made it even more beautiful. We'll keep coming back every year!", rating: 5, avatar: "دب", package_name: "luxury-yacht" },
  { name_ar: "يوسف السيد", name_en: "Yousef El-Sayed", text_ar: "الأسعار مناسبة جداً مقارنة بالخدمة اللي بيقدموها. جربت البراشوت للمرة الأولى وكانت أدرينالين خالص 🪂", text_en: "Prices are very reasonable compared to the service they provide. I tried parasailing for the first time and it was pure adrenaline 🪂", rating: 5, avatar: "يس", package_name: "full-safari" },
  { name_ar: "ريم عبدالعزيز", name_en: "Reem Abdulaziz", text_ar: "رحلة اليخت كانت منظمة أوي. في وجبة وألعاب مائية وموسيقى. احساس أننا في فيلا على البحر! تجربة ٥ نجوم.", text_en: "The yacht trip was very well organized. Food, water sports, and music — it felt like a villa on the sea! A true 5-star experience.", rating: 5, avatar: "رع", package_name: "luxury-yacht" },
  { name_ar: "إسلام جابر", name_en: "Islam Jaber", text_ar: "جبت عيلتي كلها، الكبار والصغار، وكلهم استمتعوا. الأولاد من الأكوا بارك والكبار من السفاري. تنظيم ممتاز!", text_en: "I brought my whole family — adults and kids — and everyone enjoyed themselves. Kids loved the aqua park, adults loved the safari. Great organization!", rating: 5, avatar: "إج", package_name: "family-package" },
  { name_ar: "منى الشرقاوي", name_en: "Mona El-Sharqawi", text_ar: "كنا خايفين الأول بس لما وصلنا الفريق كان متفهم ومحترف جداً. الرحلة عدت أحسن من توقعاتنا بكتير! 🚢", text_en: "We were a bit nervous at first, but when we arrived the team was incredibly understanding and professional. The trip exceeded our expectations by far! 🚢", rating: 5, avatar: "مش", package_name: "luxury-yacht" },
  { name_ar: "طارق عوض", name_en: "Tarek Awad", text_ar: "سنة على سنة بنيجي مطروح عند DR Travel. ناس بيستاهلوا الثقة. ما غيرناش ولا هنغير! كل سنة أحسن من اللي قبلها.", text_en: "Year after year we come to Matruh with DR Travel. People you can trust. We haven't changed and never will! Every year is better than the last.", rating: 5, avatar: "طع", package_name: "all-inclusive" },
  { name_ar: "آية الزهراء", name_en: "Aya El-Zahraa", text_ar: "البراشوت كانت الأكشن اللي كنت محتاجاه 😂 المنظر من فوق ده فيلم حقيقي. والتعامل محترم وآمن جداً.", text_en: "Parasailing was exactly the action I needed 😂 The view from up there is like a real movie. Very safe and respectful handling.", rating: 5, avatar: "آز", package_name: "full-safari" },
  { name_ar: "مصطفى البنا", name_en: "Mostafa El-Banna", text_ar: "حجزت للشركة بتاعتنا يوم تيم بيلدينج. الكل قال إنه أحسن نشاط عملناه في حياتنا. شكراً DR Travel على الاحترافية!", text_en: "I booked a team building day for our company. Everyone said it was the best activity we've ever done. Thank you DR Travel for the professionalism!", rating: 5, avatar: "مب", package_name: "all-inclusive" },
  { name_ar: "هدير عصام", name_en: "Hadeer Essam", text_ar: "الشقة كانت نضيفة وقريبة من البحر. والرحلات اللي حجزناها معاهم كانت رهيبة. الباقة الشاملة تستاهل كل قرش!", text_en: "The apartment was clean and close to the beach. The trips we booked with them were amazing. The all-inclusive package is worth every penny!", rating: 5, avatar: "هع", package_name: "all-inclusive" },
  { name_ar: "عبدالرحمن قاسم", name_en: "Abdulrahman Qasim", text_ar: "من أحسن الشركات السياحية في مطروح بدون مجاملة. بيهتموا بكل تفصيلة ومعندكش قلق على حاجة 👍", text_en: "Genuinely one of the best tourism companies in Matruh. They care about every detail and you won't have to worry about anything 👍", rating: 5, avatar: "عق", package_name: "all-inclusive" },
  { name_ar: "لمياء إبراهيم", name_en: "Lamia Ibrahim", text_ar: "زوجي فاجأني برحلة اليخت وكانت أجمل مفاجأة في حياتي! الغروب من على اليخت ده منظر ماشوفوش في حياتك! 🌅", text_en: "My husband surprised me with a yacht trip and it was the best surprise of my life! The sunset from the yacht is a view you'll never forget! 🌅", rating: 5, avatar: "لإ", package_name: "luxury-yacht" },
  { name_ar: "شادي المصري", name_en: "Shady El-Masri", text_ar: "الألعاب المائية كانت تحفة خصوصاً الجت سكي. والسفاري في آخر النهار على الرمال كانت تجربة فريدة أوي!", text_en: "The water sports were amazing, especially the jet ski. And the evening safari on the dunes was a truly unique experience!", rating: 5, avatar: "شم", package_name: "full-safari" },
  { name_ar: "نادين سعد", name_en: "Nadine Saad", text_ar: "حجزت أونلاين وتم التواصل في نفس اليوم. فريق عمل محترم ومنظم. الرحلة كانت فوق التوقعات بكتير! ⭐⭐⭐⭐⭐", text_en: "I booked online and was contacted the same day. A professional and organized team. The trip was way beyond expectations! ⭐⭐⭐⭐⭐", rating: 5, avatar: "نس", package_name: "all-inclusive" },
  { name_ar: "وليد منصور", name_en: "Walid Mansour", text_ar: "عملت عيد ميلاد أختي على اليخت. كانت مفاجأة ما تتصورش. قالت أحسن عيد ميلاد في حياتها. شكراً يا DR Travel!", text_en: "I celebrated my sister's birthday on the yacht. It was a surprise she could never have imagined. She said it was the best birthday of her life. Thank you DR Travel!", rating: 5, avatar: "وم", package_name: "luxury-yacht" },
  { name_ar: "إيمان السبكي", name_en: "Iman El-Sebky", text_ar: "كل سنة بنيجي مطروح وبنحجز مع DR Travel مباشرة. ناس موثوقة ومحترفة وأسعار مناسبة. فضلوا كده!", text_en: "Every year we come to Matruh and book directly with DR Travel. Trustworthy, professional, and great prices. Keep it up!", rating: 5, avatar: "إس", package_name: "all-inclusive" },
];

// ============================================================
// 3. SETTINGS — verify correct values
// ============================================================
const SETTINGS = [
  { key: "business_name_ar", value: "DR Travel" },
  { key: "business_name_en", value: "DR Travel" },
  { key: "whatsapp_number", value: "201205756024" },
  { key: "phone_number", value: "+20 120 575 6024" },
  { key: "location_ar", value: "مرسى مطروح، مصر" },
  { key: "location_en", value: "Marsa Matruh, Egypt" },
  { key: "hero_title_ar", value: "اكتشف جمال مرسى مطروح" },
  { key: "hero_title_en", value: "Discover the Beauty of Marsa Matruh" },
  { key: "hero_subtitle_ar", value: "سفاري الصحراء · رحلات يخت فاخرة · رياضات مائية · باراشوت · أكوا بارك" },
  { key: "hero_subtitle_en", value: "Desert Safari · Luxury Yacht Trips · Water Sports · Parasailing · Aqua Park" },
  { key: "facebook_url", value: "https://facebook.com/Drtrave" },
  { key: "instagram_url", value: "https://instagram.com/drtravel_marsamatrouh" },
  { key: "tiktok_url", value: "https://tiktok.com/@drtravel.marsa.matrouh" },
  { key: "default_currency", value: "EGP" },
  { key: "usd_rate", value: "50" },
  { key: "sar_rate", value: "13.3" },
  { key: "show_testimonials", value: "true" },
  { key: "show_ai_assistant", value: "true" },
  { key: "show_compare_feature", value: "true" },
];

async function run() {
  const client = await pool.connect();
  try {
    console.log("🚀 Starting DR Travel data migration...\n");

    // --- Update Packages ---
    console.log("📦 Updating packages...");
    for (const pkg of PACKAGES) {
      await client.query(`
        UPDATE packages SET
          icon=$1, title_ar=$2, title_en=$3,
          description_ar=$4, description_en=$5,
          long_description_ar=$6, long_description_en=$7,
          category=$8, price_egp=$9, max_price_egp=$10,
          duration_ar=$11, duration_en=$12,
          color=$13, badge_ar=$14, badge_en=$15, badge_color=$16,
          featured=$17, popular=$18, family_friendly=$19,
          foreigner_friendly=$20, children_friendly=$21,
          experience_level=$22, rating=$23, review_count=$24,
          images=$25, includes_ar=$26, includes_en=$27,
          excludes_ar=$28, excludes_en=$29,
          itinerary_ar=$30, itinerary_en=$31,
          why_this_trip_ar=$32, why_this_trip_en=$33,
          suitable_for=$34, what_to_bring_ar=$35, what_to_bring_en=$36,
          cancellation_ar=$37, cancellation_en=$38,
          faq=$39, similar_ids=$40,
          includes_meals=$41, includes_transport=$42, includes_accommodation=$43,
          min_group_size=$44, max_group_size=$45,
          status=$46, active=$47, sort_order=$48,
          updated_at=NOW()
        WHERE id=$49
      `, [
        pkg.icon, pkg.title_ar, pkg.title_en,
        pkg.description_ar, pkg.description_en,
        pkg.long_description_ar, pkg.long_description_en,
        pkg.category, pkg.price_egp, pkg.max_price_egp,
        pkg.duration_ar, pkg.duration_en,
        pkg.color, pkg.badge_ar, pkg.badge_en, pkg.badge_color,
        pkg.featured, pkg.popular, pkg.family_friendly,
        pkg.foreigner_friendly, pkg.children_friendly,
        pkg.experience_level, pkg.rating, pkg.review_count,
        JSON.stringify(pkg.images), JSON.stringify(pkg.includes_ar), JSON.stringify(pkg.includes_en),
        JSON.stringify(pkg.excludes_ar), JSON.stringify(pkg.excludes_en),
        JSON.stringify(pkg.itinerary_ar), JSON.stringify(pkg.itinerary_en),
        JSON.stringify(pkg.why_this_trip_ar), JSON.stringify(pkg.why_this_trip_en),
        JSON.stringify(pkg.suitable_for), JSON.stringify(pkg.what_to_bring_ar), JSON.stringify(pkg.what_to_bring_en),
        pkg.cancellation_ar, pkg.cancellation_en,
        JSON.stringify(pkg.faq), JSON.stringify(pkg.similar_ids),
        pkg.includes_meals, pkg.includes_transport, pkg.includes_accommodation,
        pkg.min_group_size, pkg.max_group_size,
        pkg.status, pkg.active, pkg.sort_order,
        pkg.id,
      ]);
      console.log(`  ✓ ${pkg.slug}: price=${pkg.price_egp}, includes=${pkg.includes_ar.length}, itin=${pkg.itinerary_ar.length}, why=${pkg.why_this_trip_ar.length}, faq=${pkg.faq.length}`);
    }

    // --- Replace Testimonials ---
    console.log("\n⭐ Replacing testimonials with real data...");
    await client.query("DELETE FROM testimonials");
    let order = 1;
    for (const t of TESTIMONIALS) {
      await client.query(`
        INSERT INTO testimonials
          (name_ar, name_en, text_ar, text_en, rating, avatar, package_name, is_visible, sort_order)
        VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8)
      `, [t.name_ar, t.name_en, t.text_ar, t.text_en, t.rating, t.avatar, t.package_name, order++]);
    }
    console.log(`  ✓ Inserted ${TESTIMONIALS.length} testimonials`);

    // --- Upsert Settings ---
    console.log("\n⚙️  Updating settings...");
    for (const s of SETTINGS) {
      await client.query(`
        INSERT INTO site_settings (key, value) VALUES ($1,$2)
        ON CONFLICT (key) DO UPDATE SET value=$2
      `, [s.key, s.value]);
    }
    console.log(`  ✓ ${SETTINGS.length} settings upserted`);

    // --- Final count ---
    const pkgCount = await client.query("SELECT COUNT(*) FROM packages WHERE status='published'");
    const testCount = await client.query("SELECT COUNT(*) FROM testimonials");
    const settCount = await client.query("SELECT COUNT(*) FROM site_settings");
    console.log("\n✅ Migration complete!");
    console.log(`   Packages (published): ${pkgCount.rows[0].count}`);
    console.log(`   Testimonials: ${testCount.rows[0].count}`);
    console.log(`   Settings: ${settCount.rows[0].count}`);

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error("❌ Migration failed:", e.message); process.exit(1); });
