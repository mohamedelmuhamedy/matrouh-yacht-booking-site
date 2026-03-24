export interface PackageData {
  id: number;
  slug: string;
  icon: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  longDescriptionAr: string;
  longDescriptionEn: string;
  category: "safari" | "yacht" | "complete" | "family";
  priceEGP: number;
  maxPriceEGP: number;
  durationAr: string;
  durationEn: string;
  color: string;
  badgeAr: string | null;
  badgeEn: string | null;
  badgeColor: string | null;
  featured: boolean;
  popular: boolean;
  familyFriendly: boolean;
  foreignerFriendly: boolean;
  childrenFriendly: boolean;
  experienceLevel: "easy" | "moderate" | "adventurous";
  rating: number;
  reviewCount: number;
  images: string[];
  includesAr: string[];
  includesEn: string[];
  excludesAr: string[];
  excludesEn: string[];
  itineraryAr: { title: string; desc: string }[];
  itineraryEn: { title: string; desc: string }[];
  whyThisTripAr: { icon: string; text: string }[];
  whyThisTripEn: { icon: string; text: string }[];
  suitableFor: string[];
  whatToBringAr: string[];
  whatToBringEn: string[];
  cancellationAr: string;
  cancellationEn: string;
  faq: { questionAr: string; questionEn: string; answerAr: string; answerEn: string }[];
  similarIds: number[];
  includesMeals: boolean;
  includesTransport: boolean;
  includesAccommodation: boolean;
  minGroupSize: number;
  maxGroupSize: number;
}

export const PACKAGES_DATA: PackageData[] = [
  {
    id: 1,
    slug: "full-safari",
    icon: "🏜️",
    titleAr: "باقة السفاري الكاملة",
    titleEn: "Full Safari Package",
    descriptionAr: "انطلق في مغامرة صحراوية لا تُنسى وسط رمال مطروح الذهبية",
    descriptionEn: "Embark on an unforgettable desert adventure across the golden sands of Matruh",
    longDescriptionAr: "تجربة السفاري الصحراوية في مرسى مطروح هي واحدة من أكثر التجارب إثارةً على الساحل الشمالي. ستنطلق مع فريقنا المحترف عبر الكثبان الرملية الذهبية، تستمتع بأجواء الصحراء الساحرة وتعيش لحظات لا تُنسى من الإثارة والمغامرة. الباقة تشمل تجربة براشوت فوق البحر الأبيض المتوسط وغداء مصري أصيل يجمعك بأجواء التراث المحلي.",
    longDescriptionEn: "The desert safari experience in Marsa Matruh is one of the most thrilling adventures on the North Coast. You'll set out with our professional team across golden sand dunes, enjoying the magical desert atmosphere and living unforgettable moments of excitement and adventure. The package includes a parasailing experience over the Mediterranean Sea and an authentic Egyptian lunch that connects you with local heritage.",
    category: "safari",
    priceEGP: 350,
    maxPriceEGP: 500,
    durationAr: "يوم كامل — ٨ ساعات",
    durationEn: "Full Day — 8 Hours",
    color: "#C9A84C",
    badgeAr: "الأكثر طلباً",
    badgeEn: "Most Popular",
    badgeColor: "#C9A84C",
    featured: true,
    popular: true,
    familyFriendly: true,
    foreignerFriendly: true,
    childrenFriendly: true,
    experienceLevel: "moderate",
    rating: 4.9,
    reviewCount: 312,
    images: [
      "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200&q=80",
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80",
      "https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=1200&q=80",
    ],
    includesAr: ["سفاري صحراوية ممتعة بالسيارات", "تجربة براشوت مثيرة فوق البحر", "غداء مصري أصيل", "مرشد سياحي خبير", "مياه ومشروبات طوال الرحلة", "تصوير احترافي"],
    includesEn: ["Exciting desert safari by 4WD", "Parasailing experience over the sea", "Authentic Egyptian lunch", "Expert tour guide", "Water & beverages throughout", "Professional photography"],
    excludesAr: ["المواصلات من وإلى الفندق", "تأمين السفر", "المصاريف الشخصية"],
    excludesEn: ["Hotel transfers", "Travel insurance", "Personal expenses"],
    itineraryAr: [
      { title: "٩:٠٠ ص — الانطلاق", desc: "التجمع في نقطة الانطلاق وتقديم الفريق والتعليمات" },
      { title: "١٠:٠٠ ص — السفاري", desc: "جولة مثيرة بالسيارات في الكثبان الرملية والواحات الطبيعية" },
      { title: "١:٠٠ م — الغداء", desc: "وجبة غداء مصرية أصيلة في قلب الصحراء" },
      { title: "٢:٣٠ م — البراشوت", desc: "تجربة البراشوت فوق البحر الأبيض المتوسط بمنظر خيالي" },
      { title: "٤:٣٠ م — العودة", desc: "العودة مع الذكريات الجميلة والصور المميزة" },
    ],
    itineraryEn: [
      { title: "9:00 AM — Departure", desc: "Meet at starting point, team introduction and safety briefing" },
      { title: "10:00 AM — Safari", desc: "Exciting 4WD ride through sand dunes and natural oases" },
      { title: "1:00 PM — Lunch", desc: "Authentic Egyptian lunch meal in the heart of the desert" },
      { title: "2:30 PM — Parasailing", desc: "Parasailing experience over the Mediterranean with breathtaking views" },
      { title: "4:30 PM — Return", desc: "Return with beautiful memories and amazing photos" },
    ],
    whyThisTripAr: [
      { icon: "🏆", text: "الأكثر طلباً من بين جميع باقاتنا" },
      { icon: "👨‍👩‍👧‍👦", text: "مناسبة للعائلات والأطفال من جميع الأعمار" },
      { icon: "💰", text: "أفضل قيمة مقابل السعر" },
      { icon: "🌍", text: "مناسبة للزوار الأجانب مع مرشد يتحدث الإنجليزية" },
      { icon: "📸", text: "تجربة فوتوغرافية استثنائية" },
    ],
    whyThisTripEn: [
      { icon: "🏆", text: "Our most booked package by far" },
      { icon: "👨‍👩‍👧‍👦", text: "Suitable for families & children of all ages" },
      { icon: "💰", text: "Best value for money" },
      { icon: "🌍", text: "Great for foreign visitors with English-speaking guide" },
      { icon: "📸", text: "An exceptional photography experience" },
    ],
    suitableFor: ["families", "foreigners", "couples", "groups"],
    whatToBringAr: ["ملابس مريحة", "واقي شمس", "نظارات شمسية", "كاميرا", "مياه إضافية"],
    whatToBringEn: ["Comfortable clothes", "Sunscreen", "Sunglasses", "Camera", "Extra water"],
    cancellationAr: "إلغاء مجاني حتى ٢٤ ساعة قبل الرحلة. الإلغاء بعد ٢٤ ساعة يستلزم دفع ٥٠٪ من قيمة الحجز.",
    cancellationEn: "Free cancellation up to 24 hours before the trip. Cancellation within 24 hours requires 50% of booking value.",
    faq: [
      { questionAr: "هل السفاري آمنة للأطفال؟", questionEn: "Is the safari safe for children?", answerAr: "نعم، سياراتنا مجهزة بالكامل لسلامة الأطفال ومرشدونا متخصصون في الرحلات العائلية.", answerEn: "Yes, our vehicles are fully equipped for child safety and our guides specialize in family trips." },
      { questionAr: "ما الملابس المناسبة؟", questionEn: "What clothes are appropriate?", answerAr: "ننصح بملابس مريحة وخفيفة اللون مع حذاء مريح وواقي شمس قوي.", answerEn: "We recommend comfortable, light-colored clothing with comfortable shoes and strong sunscreen." },
      { questionAr: "هل توجد مواصلات؟", questionEn: "Is there transportation?", answerAr: "يمكن ترتيب المواصلات بتكلفة إضافية. تواصل معنا للتفاصيل.", answerEn: "Transportation can be arranged for an additional cost. Contact us for details." },
    ],
    similarIds: [2, 3],
    includesMeals: true,
    includesTransport: false,
    includesAccommodation: false,
    minGroupSize: 1,
    maxGroupSize: 20,
  },
  {
    id: 2,
    slug: "luxury-yacht",
    icon: "🚢",
    titleAr: "باقة اليخت الفاخر",
    titleEn: "Luxury Yacht Package",
    descriptionAr: "أبحر على متن يخت فاخر وشاهد جمال البحر المتوسط",
    descriptionEn: "Sail aboard a luxury yacht and discover the beauty of the Mediterranean Sea",
    longDescriptionAr: "تجربة اليخت مع DR Travel هي رحلة بحرية فاخرة لن تنساها. ستبحر على متن يخت حديث ومجهز بالكامل عبر المياه الزرقاء الصافية للبحر المتوسط، مع إمكانية السباحة والغطس وممارسة الألعاب المائية. الرحلة تشمل وجبة خفيفة على المتن وجلسة تصوير احترافية لتوثيق هذه اللحظات الاستثنائية.",
    longDescriptionEn: "The yacht experience with DR Travel is a luxury sea voyage you'll never forget. You'll sail on a modern, fully-equipped yacht through the crystal-clear blue waters of the Mediterranean, with the possibility of swimming, diving, and water sports. The trip includes a light meal on board and a professional photography session to document these exceptional moments.",
    category: "yacht",
    priceEGP: 500,
    maxPriceEGP: 700,
    durationAr: "٤ ساعات",
    durationEn: "4 Hours",
    color: "#00AAFF",
    badgeAr: null,
    badgeEn: null,
    badgeColor: null,
    featured: false,
    popular: true,
    familyFriendly: false,
    foreignerFriendly: true,
    childrenFriendly: false,
    experienceLevel: "easy",
    rating: 4.8,
    reviewCount: 189,
    images: [
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
      "https://images.unsplash.com/photo-1545208018-a4b7bfeba8e4?w=1200&q=80",
    ],
    includesAr: ["رحلة يخت بحرية فاخرة", "ألعاب مائية متنوعة", "وجبة خفيفة على المتن", "تصوير احترافي", "معدات الغطس والسباحة"],
    includesEn: ["Luxury sea yacht ride", "Variety of water sports", "Light meal on board", "Professional photography", "Diving & swimming equipment"],
    excludesAr: ["المواصلات", "الوجبات الكاملة", "المشروبات الكحولية"],
    excludesEn: ["Transportation", "Full meals", "Alcoholic beverages"],
    itineraryAr: [
      { title: "٢:٠٠ م — الصعود", desc: "الترحيب بالضيوف على متن اليخت وشرح قواعد السلامة" },
      { title: "٢:٣٠ م — الإبحار", desc: "الانطلاق نحو أجمل مناطق البحر المتوسط" },
      { title: "٣:٣٠ م — ألعاب مائية", desc: "السباحة والألعاب المائية في المياه الزرقاء الصافية" },
      { title: "٤:٣٠ م — الوجبة الخفيفة", desc: "استمتع بوجبة خفيفة لذيذة وأنت تشاهد أفق البحر" },
      { title: "٦:٠٠ م — العودة", desc: "العودة إلى الشاطئ مع مشاهدة غروب الشمس الخلاب" },
    ],
    itineraryEn: [
      { title: "2:00 PM — Boarding", desc: "Welcome guests on board and safety briefing" },
      { title: "2:30 PM — Setting Sail", desc: "Depart toward the most beautiful Mediterranean spots" },
      { title: "3:30 PM — Water Sports", desc: "Swimming and water sports in crystal-clear blue waters" },
      { title: "4:30 PM — Light Meal", desc: "Enjoy a delicious light meal while watching the sea horizon" },
      { title: "6:00 PM — Return", desc: "Return to shore with a breathtaking sunset view" },
    ],
    whyThisTripAr: [
      { icon: "🌅", text: "منظر الغروب من على اليخت لا مثيل له" },
      { icon: "💑", text: "مثالية للأزواج والمجموعات" },
      { icon: "🌊", text: "مياه المتوسط الصافية للغطس والسباحة" },
      { icon: "🌍", text: "الأكثر طلباً من الزوار الأجانب" },
      { icon: "📸", text: "صور احترافية على المتن" },
    ],
    whyThisTripEn: [
      { icon: "🌅", text: "The sunset view from the yacht is unmatched" },
      { icon: "💑", text: "Perfect for couples and groups" },
      { icon: "🌊", text: "Crystal clear Mediterranean waters for diving & swimming" },
      { icon: "🌍", text: "Most requested by foreign visitors" },
      { icon: "📸", text: "Professional photos on board" },
    ],
    suitableFor: ["couples", "foreigners", "groups", "friends"],
    whatToBringAr: ["ملابس السباحة", "منشفة", "واقي شمس مقاوم للماء", "نظارات شمسية", "ملابس للتغيير"],
    whatToBringEn: ["Swimwear", "Towel", "Waterproof sunscreen", "Sunglasses", "Change of clothes"],
    cancellationAr: "إلغاء مجاني حتى ٤٨ ساعة قبل الرحلة. لا يوجد رد للمبلغ بعد ذلك.",
    cancellationEn: "Free cancellation up to 48 hours before the trip. No refund after that.",
    faq: [
      { questionAr: "هل الرحلة مناسبة لمن لا يجيد السباحة؟", questionEn: "Is the trip suitable for non-swimmers?", answerAr: "نعم! تتوفر سترات النجاة والمعدات اللازمة للجميع.", answerEn: "Yes! Life jackets and necessary equipment are provided for everyone." },
      { questionAr: "ما الحد الأدنى لعدد الأشخاص؟", questionEn: "What's the minimum group size?", answerAr: "الحد الأدنى شخصان. يمكن حجز رحلة خاصة.", answerEn: "Minimum 2 persons. Private trips can be arranged." },
    ],
    similarIds: [1, 3],
    includesMeals: true,
    includesTransport: false,
    includesAccommodation: false,
    minGroupSize: 2,
    maxGroupSize: 15,
  },
  {
    id: 3,
    slug: "all-inclusive",
    icon: "⭐",
    titleAr: "الباقة الشاملة",
    titleEn: "All-Inclusive Package",
    descriptionAr: "تجربة متكاملة تجمع كل ما تحبه في مكان واحد",
    descriptionEn: "A complete experience combining everything you love in one place",
    longDescriptionAr: "الباقة الشاملة هي تاج باقاتنا — تجمع بين جمال الصحراء وروعة البحر وإقامة فندقية مريحة في تجربة واحدة استثنائية. مناسبة للباحثين عن تجربة مطروح الكاملة بدون تعب الترتيب والتخطيط. فريقنا يتولى كل شيء لتعيش أفضل إجازة في حياتك.",
    longDescriptionEn: "The All-Inclusive package is the crown of our offerings — combining desert beauty, sea magnificence, and comfortable hotel accommodation in one exceptional experience. Perfect for those seeking the complete Matruh experience without the hassle of planning. Our team handles everything so you can enjoy the best vacation of your life.",
    category: "complete",
    priceEGP: 1200,
    maxPriceEGP: 1800,
    durationAr: "يومان — ليلة واحدة",
    durationEn: "2 Days — 1 Night",
    color: "#A855F7",
    badgeAr: "قيمة استثنائية",
    badgeEn: "Exceptional Value",
    badgeColor: "#00AAFF",
    featured: false,
    popular: false,
    familyFriendly: true,
    foreignerFriendly: true,
    childrenFriendly: true,
    experienceLevel: "easy",
    rating: 4.9,
    reviewCount: 97,
    images: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
      "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200&q=80",
    ],
    includesAr: ["سفاري صحراوية كاملة", "رحلة يخت فاخرة", "أكوا بارك يوم كامل", "إقامة ليلة فندقية", "جميع الوجبات", "مرشد سياحي خاص"],
    includesEn: ["Full desert safari", "Luxury yacht trip", "Full-day aqua park", "One-night hotel stay", "All meals included", "Private tour guide"],
    excludesAr: ["المصاريف الشخصية", "تأمين السفر"],
    excludesEn: ["Personal expenses", "Travel insurance"],
    itineraryAr: [
      { title: "اليوم الأول — ٩:٠٠ ص", desc: "الوصول ورحلة السفاري الصحراوية والغداء" },
      { title: "اليوم الأول — ٢:٠٠ م", desc: "رحلة اليخت وألعاب مائية وغروب الشمس" },
      { title: "اليوم الأول — الليل", desc: "إقامة فندقية مريحة وعشاء خاص" },
      { title: "اليوم الثاني — ١٠:٠٠ ص", desc: "أكوا بارك ومرح لا نهاية له للعائلة" },
      { title: "اليوم الثاني — ٤:٠٠ م", desc: "توديع مع أجمل الذكريات" },
    ],
    itineraryEn: [
      { title: "Day 1 — 9:00 AM", desc: "Arrival, desert safari, and lunch" },
      { title: "Day 1 — 2:00 PM", desc: "Yacht trip, water sports, and sunset" },
      { title: "Day 1 — Evening", desc: "Comfortable hotel stay and private dinner" },
      { title: "Day 2 — 10:00 AM", desc: "Aqua park and unlimited family fun" },
      { title: "Day 2 — 4:00 PM", desc: "Farewell with the most beautiful memories" },
    ],
    whyThisTripAr: [
      { icon: "⭐", text: "تجمع كل تجارب مطروح في باقة واحدة" },
      { icon: "💰", text: "أوفر من حجز كل نشاط منفرداً بـ ٤٠٪" },
      { icon: "🏨", text: "إقامة فندقية مريحة شاملة" },
      { icon: "🎯", text: "مناسبة للزيارات الممتدة لمطروح" },
      { icon: "👨‍👩‍👧‍👦", text: "مثالية للعائلات والمجموعات الكبيرة" },
    ],
    whyThisTripEn: [
      { icon: "⭐", text: "Combines all Matruh experiences in one package" },
      { icon: "💰", text: "40% cheaper than booking each activity separately" },
      { icon: "🏨", text: "Comfortable hotel accommodation included" },
      { icon: "🎯", text: "Ideal for extended Matruh visits" },
      { icon: "👨‍👩‍👧‍👦", text: "Perfect for families and large groups" },
    ],
    suitableFor: ["families", "couples", "foreigners", "groups"],
    whatToBringAr: ["ملابس لليومين", "ملابس السباحة", "واقي شمس", "كاميرا", "وثائق الهوية"],
    whatToBringEn: ["Clothes for 2 days", "Swimwear", "Sunscreen", "Camera", "ID documents"],
    cancellationAr: "إلغاء مجاني حتى ٧٢ ساعة قبل الرحلة. خصم ٣٠٪ للإلغاء بين ٧٢–٢٤ ساعة. بعد ٢٤ ساعة لا يوجد رد.",
    cancellationEn: "Free cancellation 72 hours before. 30% fee for 72–24 hour cancellations. No refund within 24 hours.",
    faq: [
      { questionAr: "هل يمكن تعديل البرنامج؟", questionEn: "Can the itinerary be modified?", answerAr: "نعم، يمكن تخصيص البرنامج جزئياً حسب طلبك. تواصل معنا.", answerEn: "Yes, the program can be partially customized on request. Contact us." },
      { questionAr: "ما مستوى الفندق؟", questionEn: "What's the hotel level?", answerAr: "فنادق ٣-٤ نجوم. يمكن الترقية لـ ٥ نجوم بتكلفة إضافية.", answerEn: "3-4 star hotels. Upgrade to 5 stars available for additional cost." },
    ],
    similarIds: [1, 2, 4],
    includesMeals: true,
    includesTransport: true,
    includesAccommodation: true,
    minGroupSize: 1,
    maxGroupSize: 30,
  },
  {
    id: 4,
    slug: "family-package",
    icon: "👨‍👩‍👧‍👦",
    titleAr: "باقة العائلة",
    titleEn: "Family Package",
    descriptionAr: "متعة بلا حدود للعائلة كاملها كبيرها وصغيرها",
    descriptionEn: "Unlimited fun for the whole family — young and old alike",
    longDescriptionAr: "باقة العائلة مصممة بعناية لتوفير أقصى قدر من المتعة والأمان لجميع أفراد العائلة. من الألعاب المائية المناسبة للأطفال إلى السفاري الهادئة للكبار، نضمن أن يعود كل فرد بذكريات جميلة لا تُنسى. فريقنا متدرب خصيصاً للتعامل مع الأسرة والأطفال بأمان واحترافية تامة.",
    longDescriptionEn: "The Family Package is carefully designed to provide maximum fun and safety for all family members. From water activities suitable for children to peaceful safaris for adults, we ensure everyone returns with unforgettable memories. Our team is specially trained to handle families and children with complete safety and professionalism.",
    category: "family",
    priceEGP: 1000,
    maxPriceEGP: 1400,
    durationAr: "يوم كامل",
    durationEn: "Full Day",
    color: "#25D366",
    badgeAr: null,
    badgeEn: null,
    badgeColor: null,
    featured: false,
    popular: false,
    familyFriendly: true,
    foreignerFriendly: false,
    childrenFriendly: true,
    experienceLevel: "easy",
    rating: 4.8,
    reviewCount: 156,
    images: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80",
      "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
    ],
    includesAr: ["سفاري عائلية آمنة ومرحة", "ألعاب مائية للأطفال والكبار", "أكوا بارك يوم كامل", "وجبة غداء عائلية", "مرشد متخصص في الرحلات العائلية"],
    includesEn: ["Safe & fun family safari", "Water activities for kids & adults", "Full-day aqua park", "Family lunch", "Guide specialized in family trips"],
    excludesAr: ["المواصلات", "التذاكر الإضافية بالأكوا بارك"],
    excludesEn: ["Transportation", "Extra aqua park tickets"],
    itineraryAr: [
      { title: "٩:٠٠ ص — انطلاق العائلة", desc: "التجمع والتعارف والتهيئة لرحلة مميزة" },
      { title: "١٠:٠٠ ص — السفاري العائلية", desc: "جولة هادئة وآمنة في الصحراء مناسبة للأطفال والكبار" },
      { title: "١٢:٠٠ م — الغداء", desc: "وجبة عائلية دافئة بأجواء احتفالية" },
      { title: "١:٠٠ م — الأكوا بارك", desc: "مرح بلا حدود في أكوا بارك مطروح" },
      { title: "٤:٠٠ م — نهاية مبهجة", desc: "صور عائلية جماعية وذكريات لا تُنسى" },
    ],
    itineraryEn: [
      { title: "9:00 AM — Family Kick-off", desc: "Gather, meet the team, and get ready for a special day" },
      { title: "10:00 AM — Family Safari", desc: "Calm and safe desert tour suitable for kids and adults" },
      { title: "12:00 PM — Lunch", desc: "Warm family meal in a festive atmosphere" },
      { title: "1:00 PM — Aqua Park", desc: "Unlimited fun at Matruh Aqua Park" },
      { title: "4:00 PM — Grand Finale", desc: "Group family photos and unforgettable memories" },
    ],
    whyThisTripAr: [
      { icon: "👶", text: "آمنة ١٠٠٪ للأطفال من جميع الأعمار" },
      { icon: "👨‍👩‍👧‍👦", text: "الأنسب للعائلات المصرية" },
      { icon: "🎡", text: "تشمل أكوا بارك كامل" },
      { icon: "💰", text: "سعر خاص لـ٤ أفراد" },
      { icon: "😊", text: "أعلى نسبة رضا من العملاء" },
    ],
    whyThisTripEn: [
      { icon: "👶", text: "100% safe for children of all ages" },
      { icon: "👨‍👩‍👧‍👦", text: "Most suitable for Egyptian families" },
      { icon: "🎡", text: "Includes full aqua park access" },
      { icon: "💰", text: "Special price for 4 people" },
      { icon: "😊", text: "Highest customer satisfaction rate" },
    ],
    suitableFor: ["families", "children"],
    whatToBringAr: ["ملابس مريحة للأطفال", "واقي شمس للأطفال", "ملابس سباحة", "ألعاب الأطفال الصغار", "وثائق الهوية"],
    whatToBringEn: ["Comfortable children's clothes", "Children's sunscreen", "Swimwear", "Small toys for young children", "ID documents"],
    cancellationAr: "إلغاء مجاني حتى ٢٤ ساعة قبل الرحلة.",
    cancellationEn: "Free cancellation up to 24 hours before the trip.",
    faq: [
      { questionAr: "ما الحد الأدنى لعمر الطفل؟", questionEn: "What's the minimum child age?", answerAr: "لا يوجد حد أدنى. نوفر معدات خاصة للأطفال الرضع.", answerEn: "No minimum age. We provide special equipment for infants." },
      { questionAr: "هل الرحلة مجهدة للأطفال الصغار؟", questionEn: "Is the trip tiring for young children?", answerAr: "لا. البرنامج مُصمم خصيصاً بأنشطة هادئة ومتدرجة تناسب الأطفال.", answerEn: "No. The program is specially designed with calm, gradual activities suitable for children." },
    ],
    similarIds: [1, 3],
    includesMeals: true,
    includesTransport: false,
    includesAccommodation: false,
    minGroupSize: 2,
    maxGroupSize: 25,
  },
];

export const getPackageBySlug = (slug: string) =>
  PACKAGES_DATA.find(p => p.slug === slug) ?? null;

export const getPackageById = (id: number) =>
  PACKAGES_DATA.find(p => p.id === id) ?? null;

export const getSimilarPackages = (pkg: PackageData) =>
  pkg.similarIds.map(id => getPackageById(id)).filter(Boolean) as PackageData[];
