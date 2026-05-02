#!/usr/bin/env tsx
/**
 * Idempotent seed for the 8 default Why Us cards.
 * onConflictDoNothing on slug — admin edits made later are preserved.
 */
import { db, whyUsCards } from "@workspace/db";

const U = (id: string, w = 1600) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

const DEFAULTS = [
  {
    slug: "experience",
    icon: "🏆",
    color: "#C9A84C",
    titleAr: "خبرة تتجاوز ٥ سنوات",
    titleEn: "5+ Years of Experience",
    shortDescAr: "سنوات من الخبرة في السياحة بمرسى مطروح مع آلاف العملاء السعداء",
    shortDescEn: "Years of expertise in Matruh tourism with thousands of happy customers",
    heroImageUrl: U("1492684223066-81342ee5ff30"),
    accentImageUrl: U("1521295121783-8a321d551ad2"),
    introAr: "أكثر من ٥ سنوات من الخبرة المتراكمة في تنظيم أفضل الرحلات السياحية في مرسى مطروح. نعرف كل شبر في المدينة، كل توقيت مثالي، وكل تجربة تستاهل تعيشها.",
    introEn: "Over 5 years of accumulated expertise in organizing the best tours in Marsa Matruh. We know every inch of the city, every perfect timing, and every experience worth living.",
    bodyAr: "خلال السنين دي، تعاملنا مع آلاف العملاء من كل مكان — مصريين، عرب، وأجانب. كل تجربة كانت بتعلّمنا حاجة جديدة، وكل ملاحظة كنا بنطبّقها علشان رحلتك القادمة تكون أحسن من اللي قبلها. مش بس بنقدّم رحلات — إحنا بنبني علاقة طويلة مع كل عميل بيختارنا، وده اللي بيخلّي ٧٠٪ من عملائنا بيرجعولنا تاني.",
    bodyEn: "During these years, we've served thousands of clients from everywhere — Egyptians, Arabs, and foreigners. Every experience taught us something new, and every piece of feedback we applied to make your next trip better than the last. We don't just offer trips — we build a long relationship with every client who chooses us, which is why 70% of our clients come back.",
    bullets: [
      { icon: "🌟", titleAr: "آلاف العملاء السعداء", titleEn: "Thousands of Happy Clients", descAr: "أكثر من ٥٠٠٠ عميل اختاروا DR Travel وعدوا تجربتهم خمس نجوم", descEn: "Over 5,000 clients chose DR Travel and rated their experience 5 stars" },
      { icon: "📍", titleAr: "معرفة عميقة بمطروح", titleEn: "Deep Knowledge of Matruh", descAr: "فريقنا من أهل المنطقة وبيعرف كل خليج، كل توقيت، وكل قصة", descEn: "Our team is local and knows every bay, every timing, and every story" },
      { icon: "🤝", titleAr: "شراكات قوية محلياً", titleEn: "Strong Local Partnerships", descAr: "علاقات راسخة مع أفضل مزودي الخدمات تضمن لك جودة وأسعار أفضل", descEn: "Solid partnerships with the best providers guarantee better quality and prices" },
      { icon: "🔄", titleAr: "تحسين مستمر", titleEn: "Continuous Improvement", descAr: "بنطوّر خدماتنا كل موسم بناءً على ملاحظات عملائنا الكرام", descEn: "We improve our services every season based on our valued clients' feedback" },
    ],
    stats: [
      { icon: "📅", value: "5+", labelAr: "سنوات خبرة", labelEn: "Years" },
      { icon: "👥", value: "5K+", labelAr: "عميل سعيد", labelEn: "Happy Clients" },
      { icon: "🔁", value: "70%", labelAr: "نسبة العودة", labelEn: "Return Rate" },
    ],
    galleryImages: [U("1481627834876-b7833e8f5570"), U("1444065381814-865dc9da92c0"), U("1551434678-e076c223a692")],
    ctaTextAr: "اكتشف رحلاتنا",
    ctaTextEn: "Discover Our Trips",
    ctaLink: "/trips",
    sortOrder: 1,
  },
  {
    slug: "best-prices",
    icon: "💰",
    color: "#00AAFF",
    titleAr: "أفضل الأسعار مضمونة",
    titleEn: "Best Prices Guaranteed",
    shortDescAr: "أسعار تنافسية لا تُقارن مع خدمة على أعلى مستوى من الجودة والاحترافية",
    shortDescEn: "Unbeatable competitive pricing with the highest level of quality and professionalism",
    heroImageUrl: U("1554224155-8d04cb21cd6c"),
    accentImageUrl: U("1521737711867-e3b97375f902"),
    introAr: "بنؤمن إن السياحة الجميلة لازم تكون متاحة للكل. علشان كده، أسعارنا مدروسة بعناية تجمع بين الجودة العالية والقيمة الحقيقية، من غير أي رسوم خفية أو مفاجآت في الفاتورة.",
    introEn: "We believe great tourism should be accessible to everyone. That's why our pricing is carefully designed to combine high quality with real value — no hidden fees, no surprises on the invoice.",
    bodyAr: "بنتعامل مباشرة مع مزودي الخدمة في مطروح، وده بيخلّينا نحذف الوسطاء ونوصّل لك أحسن سعر ممكن. وكمان عندنا عروض موسمية، خصومات للمجموعات، وباقات شاملة بتوفّر عليك حتى ٣٠٪ مقارنة بالحجز كل خدمة لوحدها. بنوضّح لك كل تفصيلة في السعر قبل ما تدفع جنيه واحد.",
    bodyEn: "We deal directly with service providers in Matruh, cutting out middlemen to bring you the best possible price. We also offer seasonal deals, group discounts, and all-inclusive packages that save you up to 30% compared to booking each service separately. Every detail of the price is transparent before you pay a single pound.",
    bullets: [
      { icon: "💸", titleAr: "بدون رسوم خفية", titleEn: "No Hidden Fees", descAr: "السعر اللي بتشوفه هو السعر اللي بتدفعه — كل شيء واضح من البداية", descEn: "The price you see is the price you pay — everything is clear from the start" },
      { icon: "🎁", titleAr: "عروض وخصومات دائمة", titleEn: "Constant Offers & Discounts", descAr: "خصومات للمجموعات والعائلات وعروض موسمية تصل إلى ٣٠٪", descEn: "Group, family, and seasonal discounts up to 30%" },
      { icon: "📊", titleAr: "تسعير شفاف", titleEn: "Transparent Pricing", descAr: "تفصيل كامل لكل بند في الفاتورة قبل ما تأكّد الحجز", descEn: "Full breakdown of every line item before you confirm" },
      { icon: "🛡️", titleAr: "ضمان أفضل سعر", titleEn: "Best Price Guarantee", descAr: "لو لقيت نفس الخدمة بسعر أقل، هنطابق السعر أو نرجّع لك الفرق", descEn: "Find the same service cheaper? We'll match it or refund the difference" },
    ],
    stats: [
      { icon: "💰", value: "30%", labelAr: "وفر يصل إلى", labelEn: "Save up to" },
      { icon: "✨", value: "0", labelAr: "رسوم خفية", labelEn: "Hidden Fees" },
      { icon: "🎯", value: "100%", labelAr: "ضمان أفضل سعر", labelEn: "Price Match" },
    ],
    galleryImages: [U("1556742049-0cfed4f6a45d"), U("1556740758-90de374c12ad"), U("1554224154-26032ffc0d07")],
    ctaTextAr: "شوف الباقات والأسعار",
    ctaTextEn: "View Packages & Prices",
    ctaLink: "/trips",
    sortOrder: 2,
  },
  {
    slug: "safety",
    icon: "🛡️",
    color: "#A855F7",
    titleAr: "أمان وسلامة ١٠٠٪",
    titleEn: "100% Safety & Security",
    shortDescAr: "جميع رحلاتنا تلتزم بأعلى معايير الأمان مع معدات حديثة ومرشدين معتمدين",
    shortDescEn: "All our trips adhere to the highest safety standards with modern equipment and certified guides",
    heroImageUrl: U("1565793298595-6a879b1d9492"),
    accentImageUrl: U("1568992687947-868a62a9f521"),
    introAr: "سلامتك أهم من أي حاجة عندنا. كل رحلة بنعملها بتمر بفحص أمان كامل، وكل معدة بنستخدمها معتمدة دولياً ومراجعة قبل كل استخدام. مش بنعرف معنى للتنازل لما يجي الموضوع لسلامة عملائنا.",
    introEn: "Your safety matters more than anything to us. Every trip we run goes through a full safety check, and every piece of equipment we use is internationally certified and inspected before each use. We don't compromise when it comes to our clients' safety.",
    bodyAr: "كل المرشدين والكباتن عندنا حاصلين على شهادات معتمدة في الإسعافات الأولية والإنقاذ البحري. سترات النجاة، أحزمة الأمان، ومعدات الاتصال موجودة في كل رحلة. وعندنا تأمين كامل لكل العملاء أثناء الرحلة، وفريق طوارئ متاح ٢٤/٧ في حالة أي ظرف.",
    bodyEn: "All our guides and captains are certified in first aid and marine rescue. Life vests, safety harnesses, and communication equipment are available on every trip. We have full insurance for all clients during the trip, and a 24/7 emergency team available for any situation.",
    bullets: [
      { icon: "🦺", titleAr: "معدات أمان حديثة", titleEn: "Modern Safety Gear", descAr: "سترات نجاة وخوذ ومعدات إنقاذ مفحوصة قبل كل رحلة", descEn: "Life vests, helmets, and rescue gear inspected before every trip" },
      { icon: "🎓", titleAr: "مرشدون معتمدون", titleEn: "Certified Guides", descAr: "كل المرشدين حاصلين على تدريب رسمي في الإسعاف والإنقاذ", descEn: "All guides have official training in first aid and rescue" },
      { icon: "🚑", titleAr: "تأمين شامل", titleEn: "Comprehensive Insurance", descAr: "تأمين كامل لكل عميل ضد أي حوادث أثناء الرحلة", descEn: "Full insurance covering every client against any incidents on trip" },
      { icon: "📞", titleAr: "طوارئ ٢٤/٧", titleEn: "24/7 Emergency Line", descAr: "خط ساخن للطوارئ متاح في كل وقت — رد فوري", descEn: "Hotline available anytime — instant response" },
    ],
    stats: [
      { icon: "🛡️", value: "100%", labelAr: "معدات معتمدة", labelEn: "Certified Gear" },
      { icon: "⚕️", value: "0", labelAr: "حوادث جسيمة", labelEn: "Serious Incidents" },
      { icon: "🆘", value: "24/7", labelAr: "خط طوارئ", labelEn: "Emergency Line" },
    ],
    galleryImages: [U("1530541930197-ff16ac917b0e"), U("1602002418082-a4443e081dd1"), U("1583407723467-9b2d22504831")],
    ctaTextAr: "احجز بأمان كامل",
    ctaTextEn: "Book Safely Now",
    ctaLink: "/trips",
    sortOrder: 3,
  },
  {
    slug: "support-247",
    icon: "📱",
    color: "#25D366",
    titleAr: "دعم على مدار الساعة",
    titleEn: "24/7 Support",
    shortDescAr: "فريقنا متاح ٢٤/٧ للرد على جميع استفساراتك وتلبية احتياجاتك فوراً",
    shortDescEn: "Our team is available around the clock to answer all your queries and meet your needs instantly",
    heroImageUrl: U("1556761175-5973dc0f32e7"),
    accentImageUrl: U("1556745753-b2904692b3cd"),
    introAr: "في أي وقت، أي يوم، فريقنا موجود لخدمتك. سواء عايز تسأل عن باقة، تعدّل حجز، أو محتاج مساعدة عاجلة وأنت في مطروح، إحنا على بُعد رسالة واحدة.",
    introEn: "Anytime, any day, our team is here for you. Whether you need to ask about a package, modify a booking, or need urgent help while in Matruh, we're just one message away.",
    bodyAr: "بنرد على الواتساب في أقل من ٥ دقائق ٩٠٪ من الوقت، وعندنا فريق متعدد اللغات (عربي، إنجليزي، ألماني، روسي) علشان نخدم كل عملائنا. وقت الرحلة، فيه منسّق مخصص لكل مجموعة بيكون متاح طول اليوم لأي طلب أو استفسار.",
    bodyEn: "We respond on WhatsApp in under 5 minutes 90% of the time, and we have a multilingual team (Arabic, English, German, Russian) to serve all our clients. During your trip, a dedicated coordinator is assigned to each group, available all day for any request or question.",
    bullets: [
      { icon: "💬", titleAr: "واتساب فوري", titleEn: "Instant WhatsApp", descAr: "رد في أقل من ٥ دقائق على مدار اليوم — مش بوتات، ناس حقيقيين", descEn: "Reply in under 5 minutes anytime — no bots, real people" },
      { icon: "🌍", titleAr: "فريق متعدد اللغات", titleEn: "Multilingual Team", descAr: "عربي، إنجليزي، ألماني، روسي — تواصل معانا باللغة اللي تريحك", descEn: "Arabic, English, German, Russian — speak with us in the language you prefer" },
      { icon: "👨‍💼", titleAr: "منسّق مخصص لكل رحلة", titleEn: "Dedicated Trip Coordinator", descAr: "شخص واحد بيتابع رحلتك من البداية للنهاية — بتعرف بمين تتواصل دايماً", descEn: "One person handles your trip start to finish — you always know who to contact" },
      { icon: "⏱️", titleAr: "حلول سريعة لأي طارئ", titleEn: "Fast Solutions for Anything", descAr: "تأخير، تغيير جو، أو طلب خاص؟ بنحلّ كل حاجة فوراً", descEn: "Delay, weather change, special request? We solve it instantly" },
    ],
    stats: [
      { icon: "⏱️", value: "<5", labelAr: "دقائق رد", labelEn: "Min Response" },
      { icon: "🌐", value: "4", labelAr: "لغات", labelEn: "Languages" },
      { icon: "📞", value: "24/7", labelAr: "متاحون", labelEn: "Available" },
    ],
    galleryImages: [U("1577563908411-5077b6dc7624"), U("1521791136064-7986c2920216"), U("1551836022-d5d88e9218df")],
    ctaTextAr: "كلّمنا على واتساب",
    ctaTextEn: "Chat on WhatsApp",
    ctaLink: "/trips",
    sortOrder: 4,
  },
  {
    slug: "five-stars",
    icon: "⭐",
    color: "#F97316",
    titleAr: "تقييم ٥ نجوم دائماً",
    titleEn: "Always 5-Star Rated",
    shortDescAr: "نفخر بتقييم ٥ نجوم من عملائنا الكرام الذين يعودون إلينا كل عام",
    shortDescEn: "We pride ourselves on a 5-star rating from our valued clients who return to us every year",
    heroImageUrl: U("1517048676732-d65bc937f952"),
    accentImageUrl: U("1493612276216-ee3925520721"),
    introAr: "تقييم خمس نجوم مش رقم — ده ثقة آلاف العملاء اللي اختارونا، عاشوا تجربتنا، وحكوا عنها لكل اللي حواليهم. كل نجمة بنكسبها بشغل حقيقي وبخدمة من القلب.",
    introEn: "A 5-star rating isn't just a number — it's the trust of thousands of clients who chose us, lived our experience, and told everyone around them. Every star we earn comes from real work and heartfelt service.",
    bodyAr: "متوسط تقييمنا على Google و Tripadvisor و Booking هو ٤.٩ من ٥. أكتر من ١٢٠٠ مراجعة موثقة من عملاء فعليين جربوا رحلاتنا. وأكتر من ٧٠٪ من حجوزاتنا الجديدة بتيجي بترشيح من عميل سابق — وده أكبر شهادة على إن اللي بنعمله مستحق التقدير ده.",
    bodyEn: "Our average rating on Google, Tripadvisor, and Booking is 4.9 out of 5. Over 1,200 documented reviews from real clients who experienced our trips. Over 70% of our new bookings come from referrals by past clients — the biggest proof that what we do deserves this recognition.",
    bullets: [
      { icon: "⭐", titleAr: "تقييم ٤.٩/٥", titleEn: "4.9/5 Rating", descAr: "متوسط تقييمنا على كل المنصات الكبيرة — Google و Tripadvisor و Booking", descEn: "Our average across all major platforms — Google, Tripadvisor, Booking" },
      { icon: "📝", titleAr: "+١٢٠٠ مراجعة موثقة", titleEn: "1,200+ Verified Reviews", descAr: "كل مراجعة من عميل حقيقي جرّب الخدمة بنفسه", descEn: "Every review from a real client who experienced the service" },
      { icon: "🤗", titleAr: "ترشيحات من القلب", titleEn: "Heartfelt Referrals", descAr: "أكتر من ٧٠٪ من حجوزاتنا بتيجي بترشيح من عملاء سابقين", descEn: "Over 70% of bookings come from past-client referrals" },
      { icon: "🏅", titleAr: "جوائز التميز", titleEn: "Excellence Awards", descAr: "حاصلين على جوائز Tripadvisor للتميز ٣ سنوات متتالية", descEn: "Winners of Tripadvisor Excellence Awards 3 years in a row" },
    ],
    stats: [
      { icon: "⭐", value: "4.9", labelAr: "متوسط التقييم", labelEn: "Average Rating" },
      { icon: "📝", value: "1.2K+", labelAr: "مراجعة", labelEn: "Reviews" },
      { icon: "🤝", value: "70%", labelAr: "حجوزات بترشيح", labelEn: "Referrals" },
    ],
    galleryImages: [U("1488646953014-85cb44e25828"), U("1469854523086-cc02fe5d8800"), U("1517048676732-d65bc937f952")],
    ctaTextAr: "اقرأ آراء عملائنا",
    ctaTextEn: "Read Client Reviews",
    ctaLink: "/#reviews",
    sortOrder: 5,
  },
  {
    slug: "personalized",
    icon: "🎯",
    color: "#EC4899",
    titleAr: "تجارب مخصصة لك",
    titleEn: "Personalized Experiences",
    shortDescAr: "نصمم رحلتك وفق احتياجاتك وتفضيلاتك لتكون تجربة فريدة لا تُنسى",
    shortDescEn: "We design your trip according to your needs and preferences for a truly unique experience",
    heroImageUrl: U("1469854523086-cc02fe5d8800"),
    accentImageUrl: U("1450101499163-c8848c66ca85"),
    introAr: "مفيش رحلتين زي بعض عندنا. كل عميل بيخش رحلة بتفصيل خصوصي ليه — حسب اهتماماته، عمره، عيلته، وحتى مزاجه. بنسمعك الأول، وبعدين بنصمم لك حاجة ما عشتهاش قبل كده.",
    introEn: "No two trips are the same with us. Every client gets a trip tailored to them — based on their interests, age, family, and even mood. We listen first, then design something you've never lived before.",
    bodyAr: "سواء عايز رحلة هادية لاسترخاء كامل، أو مغامرة كاملة بأقصى أدرينالين، أو يوم عائلي بمعالم مختلفة للأطفال والكبار — كل ده بنرتّبه لك. عندك مناسبة خاصة؟ عيد ميلاد، خطوبة، عسل، تخرج؟ بنحوّلها لذكرى مش هتنساها أبداً. مفيش طلب صعب علينا.",
    bodyEn: "Whether you want a quiet trip for full relaxation, a full-on adventure with maximum adrenaline, or a family day with attractions for kids and adults — we arrange it all. Got a special occasion? Birthday, engagement, honeymoon, graduation? We turn it into a memory you'll never forget. No request is too hard.",
    bullets: [
      { icon: "👂", titleAr: "نسمعك الأول", titleEn: "We Listen First", descAr: "محادثة مفصلة قبل ما نقترح أي حاجة — علشان رحلتك تكون قدّك", descEn: "A detailed conversation before we suggest anything — so your trip fits you perfectly" },
      { icon: "🎂", titleAr: "مناسبات خاصة", titleEn: "Special Occasions", descAr: "بنحوّل عيد ميلادك، خطوبتك، أو عسلك لذكرى مدهشة", descEn: "We turn your birthday, engagement, or honeymoon into an amazing memory" },
      { icon: "👨‍👩‍👧", titleAr: "خطط حسب نوع المسافر", titleEn: "Plans by Traveler Type", descAr: "عائلة، شباب، كبار سن، أزواج — كل واحد له تجربة مفصّلة", descEn: "Families, youth, seniors, couples — each gets a tailored experience" },
      { icon: "✨", titleAr: "لمسات شخصية", titleEn: "Personal Touches", descAr: "تفاصيل صغيرة بتفرق — مفاجآت، تذكارات، توقيتات مدروسة", descEn: "Small details that matter — surprises, mementos, thoughtful timings" },
    ],
    stats: [
      { icon: "🎨", value: "100%", labelAr: "تخصيص", labelEn: "Customized" },
      { icon: "💝", value: "50+", labelAr: "نوع مناسبة", labelEn: "Occasion Types" },
      { icon: "🌟", value: "Unique", labelAr: "تجربة فريدة", labelEn: "Each Trip" },
    ],
    galleryImages: [U("1502920917128-1aa500764cbd"), U("1517457373958-b7bdd4587205"), U("1519741497674-611481863552")],
    ctaTextAr: "صمّم رحلتك معنا",
    ctaTextEn: "Design Your Trip",
    ctaLink: "/trips",
    sortOrder: 6,
  },
  {
    slug: "local-team",
    icon: "🧭",
    color: "#06B6D4",
    titleAr: "فريق محلي يعرف مطروح",
    titleEn: "Local Matruh Expertise",
    shortDescAr: "نختار لك أنسب الأماكن والتوقيتات لأن فريقنا من قلب مطروح وخبرتها",
    shortDescEn: "Our local team knows the best places and timing for every experience",
    heroImageUrl: U("1488646953014-85cb44e25828"),
    accentImageUrl: U("1606761568499-6d2451b23c66"),
    introAr: "إحنا مش شركة بتبعت سياح وبس — إحنا أهل المنطقة. فريقنا اتولد، عاش، وكبر في مطروح. بنعرف كل خليج خفي، كل توقيت مثالي للغروب، وكل مطعم بحري بيقدّم أحلى أكل من غير زحمة.",
    introEn: "We're not just a company sending tourists — we're locals. Our team was born, raised, and grew up in Matruh. We know every hidden bay, every perfect sunset timing, and every seafood spot serving the best food without crowds.",
    bodyAr: "اللي بنوصلك له، السائح العادي مستحيل يلاقيه. أماكن ساحرة بتبقى فاضية تماماً في توقيتات معينة، أحسن وقت لكل نشاط حسب الموسم، ومطاعم وكافيهات محلية فيها روح حقيقية — ده اللي بنشاركه معاك. مع DR Travel، أنت مش بتزور مطروح، أنت بتعيشها زي أهلها.",
    bodyEn: "What we take you to, the average tourist will never find. Magical spots that are completely empty at specific times, the best window for each activity by season, and local restaurants and cafes with real soul — that's what we share. With DR Travel, you don't visit Matruh, you live it like a local.",
    bullets: [
      { icon: "🗺️", titleAr: "أماكن خفية لا يعرفها غيرنا", titleEn: "Hidden Spots Only Locals Know", descAr: "خلجان وأماكن سحرية بعيدة عن الزحمة — تجربة خاصة لعملائنا فقط", descEn: "Bays and magical spots away from crowds — exclusive to our clients" },
      { icon: "⏰", titleAr: "توقيتات مثالية", titleEn: "Perfect Timings", descAr: "بنعرف امتى البحر هادي، امتى الغروب أحلى، امتى المكان فاضي", descEn: "We know when the sea is calm, when the sunset is best, when the spot is empty" },
      { icon: "🍽️", titleAr: "مطاعم محلية أصلية", titleEn: "Authentic Local Eateries", descAr: "أحسن أكل بحري في المنطقة بأسعار حقيقية مش سياحية", descEn: "The best seafood at honest local prices, not tourist markup" },
      { icon: "📚", titleAr: "قصص وحكايات المنطقة", titleEn: "Local Stories & Lore", descAr: "كل مكان عندنا له حكاية بنحكيها لك تخلّي التجربة أعمق", descEn: "Every place has a story we tell to make the experience deeper" },
    ],
    stats: [
      { icon: "🏠", value: "100%", labelAr: "فريق محلي", labelEn: "Local Team" },
      { icon: "🗺️", value: "50+", labelAr: "مكان خفي", labelEn: "Hidden Spots" },
      { icon: "📖", value: "∞", labelAr: "قصص وحكايات", labelEn: "Stories" },
    ],
    galleryImages: [U("1532274402911-5a369e4c4bb5"), U("1597212720158-e21302aff2b7"), U("1530541930197-ff16ac917b0e")],
    ctaTextAr: "اكتشف مطروح معانا",
    ctaTextEn: "Explore Matruh With Us",
    ctaLink: "/trips",
    sortOrder: 7,
  },
  {
    slug: "fast-booking",
    icon: "⚡",
    color: "#10B981",
    titleAr: "حجز سريع وواضح",
    titleEn: "Fast & Clear Booking",
    shortDescAr: "خطوات حجز بسيطة وتأكيد سريع بدون تعقيد أو مصاريف مخفية",
    shortDescEn: "Simple booking steps and quick confirmation with no hidden surprises",
    heroImageUrl: U("1515378791036-0648a3ef77b2"),
    accentImageUrl: U("1570126618953-d437176e8c79"),
    introAr: "الحجز معانا أبسط من إنك تطلب أكل أونلاين. ٣ خطوات بسيطة، تأكيد فوري على الواتساب، وتفاصيل واضحة من البداية للنهاية. مفيش بيروقراطية، مفيش انتظار، مفيش مفاجآت.",
    introEn: "Booking with us is simpler than ordering food online. 3 simple steps, instant WhatsApp confirmation, and clear details from start to finish. No bureaucracy, no waiting, no surprises.",
    bodyAr: "اختار الباقة، ادخل بياناتك، استلم تأكيد الحجز في أقل من ٥ دقائق. بنقبل كل وسائل الدفع الشائعة — كاش، فودافون كاش، إنستا باي، فيزا — وعندنا مرونة كاملة في التعديل أو الإلغاء قبل ٢٤ ساعة من الرحلة بدون أي رسوم. كل خطوة موثّقة على الواتساب علشان تبقى مرتاح ومطمن.",
    bodyEn: "Choose the package, enter your details, receive booking confirmation in under 5 minutes. We accept all popular payment methods — cash, Vodafone Cash, InstaPay, Visa — and we offer full flexibility to modify or cancel up to 24 hours before the trip with no fees. Every step is documented on WhatsApp so you feel comfortable and reassured.",
    bullets: [
      { icon: "1️⃣", titleAr: "خطوات بسيطة", titleEn: "Simple Steps", descAr: "اختار، ادخل بياناتك، أكّد — كده وخلاص", descEn: "Choose, enter details, confirm — that's it" },
      { icon: "⚡", titleAr: "تأكيد فوري", titleEn: "Instant Confirmation", descAr: "تأكيد على الواتساب في أقل من ٥ دقائق", descEn: "WhatsApp confirmation in under 5 minutes" },
      { icon: "💳", titleAr: "كل وسائل الدفع", titleEn: "All Payment Methods", descAr: "كاش، فودافون كاش، إنستا باي، فيزا — اختار اللي يريحك", descEn: "Cash, Vodafone Cash, InstaPay, Visa — pick what works for you" },
      { icon: "🔄", titleAr: "مرونة في التعديل", titleEn: "Flexible Modifications", descAr: "تعديل أو إلغاء قبل ٢٤ ساعة من الرحلة بدون أي رسوم", descEn: "Modify or cancel up to 24h before the trip with no fees" },
    ],
    stats: [
      { icon: "⚡", value: "<5", labelAr: "دقائق تأكيد", labelEn: "Min Confirm" },
      { icon: "🔢", value: "3", labelAr: "خطوات فقط", labelEn: "Steps Only" },
      { icon: "💸", value: "0", labelAr: "رسوم إلغاء", labelEn: "Cancel Fees" },
    ],
    galleryImages: [U("1551434678-e076c223a692"), U("1556761175-5973dc0f32e7"), U("1554224155-8d04cb21cd6c")],
    ctaTextAr: "احجز رحلتك دلوقتي",
    ctaTextEn: "Book Your Trip Now",
    ctaLink: "/trips",
    sortOrder: 8,
  },
];

async function main() {
  console.log("🌱 Seeding why-us cards...");
  let inserted = 0, skipped = 0;
  for (const card of DEFAULTS) {
    const result = await db.insert(whyUsCards).values(card).onConflictDoNothing({ target: whyUsCards.slug }).returning();
    if (result.length > 0) {
      console.log(`  ✓ inserted: ${card.slug}`);
      inserted++;
    } else {
      console.log(`  − exists:   ${card.slug}`);
      skipped++;
    }
  }
  console.log(`\n✅ Done. Inserted: ${inserted}, skipped: ${skipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
