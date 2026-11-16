import type { Lang } from "@/lib/i18n";

export type LegalSection = { heading: string; paragraphs: string[] };

export type LegalDoc = {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

const TERMS_EN: LegalDoc = {
  title: "Terms of Use",
  updated: "Last updated: 16 November 2026",
  intro:
    "Welcome to Wondrix. These Terms of Use explain how families may use the Wondrix app and website. By using Wondrix, a parent or guardian accepts these terms for themselves and for any child profile they create.",
  sections: [
    {
      heading: "1. Who we are",
      paragraphs: [
        "Wondrix is a learning companion for children and parents. It offers School practice, Wonder (curiosity chat), and a Parent Dashboard. Wondrix was built for the Dubai Create AI Agents Championship with Dubai Chamber of Digital Economy.",
        "These terms apply to the Wondrix web app and related pages (including the marketing site, Terms, and Privacy).",
      ],
    },
    {
      heading: "2. Who may use Wondrix",
      paragraphs: [
        "A parent or legal guardian must set up Wondrix and create child profiles. Children use School and Wonder under that parent’s supervision.",
        "You must provide accurate information in Parent settings (for example nickname, age band, and school year) so practice stays suitable.",
      ],
    },
    {
      heading: "3. What Wondrix does",
      paragraphs: [
        "School helps practise programme-style skills with quizzes, reading, and gap checks. Wonder answers curiosity questions with text, optional voice, and simple visuals. The Parent Dashboard lets you steer grade, subjects, calm mode, and safety tools.",
        "Answers may come from on-device logic or from AI services we configure. Content can be wrong or incomplete. Wondrix is a learning aid, not a school, tutor replacement, or medical, legal, or emergency service.",
      ],
    },
    {
      heading: "4. Parent responsibility",
      paragraphs: [
        "You are responsible for the device, the parent password, and how your child uses Wondrix. Keep the parent PIN private. Review Parent summaries and safety tools regularly.",
        "You decide whether voice, microphone, and photos (such as textbook pictures) are used on your device.",
      ],
    },
    {
      heading: "5. Acceptable use",
      paragraphs: [
        "Do not use Wondrix to harm others, break the law, bypass safety redirects, scrape or attack our services, or upload illegal or abusive content.",
        "We may limit or stop access if use is abusive, unsafe, or breaks these terms.",
      ],
    },
    {
      heading: "6. Safety and content limits",
      paragraphs: [
        "Wonder tries to redirect unsafe topics to safer ones and may record that a redirect happened for the parent summary. Safety filters are helpful, not perfect. Stay nearby when a young child chats.",
        "School questions are designed for practice. They are not an official exam or curriculum certificate.",
      ],
    },
    {
      heading: "7. Accounts, data on the device, and availability",
      paragraphs: [
        "Much of today’s demo stores household and learning data in the browser on your device (local storage). Clearing site data can erase profiles, chats, and progress.",
        "Wondrix may change, pause, or end features as we improve the product. We do not promise uninterrupted or error-free service.",
      ],
    },
    {
      heading: "8. Intellectual property",
      paragraphs: [
        "Wondrix branding, owl character art, and app design belong to the Wondrix project and its creators. You may use the app for personal family learning. You may not copy, sell, or reverse engineer the service for a competing product without permission.",
      ],
    },
    {
      heading: "9. Disclaimer",
      paragraphs: [
        "Wondrix is provided “as is” for educational and demonstration use. To the fullest extent allowed by law, we disclaim warranties of fitness for a particular purpose and non-infringement.",
        "We are not liable for learning outcomes, exam results, or decisions made based on app content, or for loss of local data on your device.",
      ],
    },
    {
      heading: "10. Changes",
      paragraphs: [
        "We may update these Terms. The “Last updated” date will change when we do. Continued use after an update means you accept the new Terms.",
      ],
    },
    {
      heading: "11. Contact",
      paragraphs: [
        "Questions about these Terms: use the Parent Dashboard website link’s contact path when published, or reach the team through the Dubai Create programme channels used for Wondrix.",
      ],
    },
  ],
};

const PRIVACY_EN: LegalDoc = {
  title: "Privacy Policy",
  updated: "Last updated: 16 November 2026",
  intro:
    "This Privacy Policy explains what Wondrix collects, why, and how parents stay in control. Wondrix is built for families. We aim to keep children’s data minimal and understandable.",
  sections: [
    {
      heading: "1. Scope",
      paragraphs: [
        "This policy covers the Wondrix web app and related pages. It is written for parents and guardians in plain language.",
      ],
    },
    {
      heading: "2. Data we process",
      paragraphs: [
        "On your device (browser local storage), Wondrix may keep: child nicknames, ages, grade or year, curriculum choice, subjects, calm mode, theme and language, mastery and practice progress, Wonder chat history for the household, safety redirect counts, parent PIN (stored for locking Parent), optional textbook photos you add, and similar settings.",
        "If you use voice features, audio is processed to speak or to turn speech into text. Depending on configuration, speech may use the device’s system voices, an in-browser voice model, and/or a cloud text-to-speech or recognition service (for example Azure Speech when enabled).",
        "If AI chat or planning is enabled, question text and limited context (such as grade band or recent turns) may be sent to an AI provider so Wondrix can reply. We ask providers not to use that content to train their public models where the provider allows that setting.",
      ],
    },
    {
      heading: "3. Why we use data",
      paragraphs: [
        "To run School and Wonder for your child, personalise difficulty and language, keep Parent controls working, show safety and learning summaries, and improve reliability during demos and tests.",
        "We do not sell children’s personal information. We do not use Wondrix data for third-party advertising.",
      ],
    },
    {
      heading: "4. Children",
      paragraphs: [
        "Wondrix is meant for children with a parent account. Parents create and manage profiles. Do not enter a child’s full legal name, school ID, address, or other sensitive identity details into free-text fields unless you choose to.",
        "Wonder tries to avoid unsafe topics. Parents should still supervise younger children.",
      ],
    },
    {
      heading: "5. Sharing",
      paragraphs: [
        "We may share technical data with infrastructure or AI / speech vendors only as needed to provide the feature you used (for example generating an answer or playing neural speech).",
        "We may disclose information if required by law or to protect a child or others from serious harm.",
      ],
    },
    {
      heading: "6. Storage and retention",
      paragraphs: [
        "Demo builds primarily store household data on the device. You can clear it by clearing the site’s data in the browser or resetting the app storage.",
        "Server logs for API calls (if any) are kept only as long as needed for security and debugging, then discarded under normal operations.",
      ],
    },
    {
      heading: "7. Security",
      paragraphs: [
        "We use a parent PIN to limit access to Parent settings on the shared device. No method is perfect. Use a device lock screen as well.",
        "Avoid using Wondrix on a shared public computer if you care about leaving local profiles behind.",
      ],
    },
    {
      heading: "8. Your choices",
      paragraphs: [
        "In Parent Dashboard you can edit or remove child details you added, change language and theme, and review safety information. You can stop using voice or mic features anytime.",
        "You may request deletion of server-side data associated with a future cloud account by contacting us once that account system exists. For the current on-device demo, clearing local site data removes the household copy on that browser.",
      ],
    },
    {
      heading: "9. International use",
      paragraphs: [
        "Wondrix is demonstrated in the UAE (Dubai Create). If AI or speech vendors are outside the UAE, data needed for that request may be processed in those regions under the vendor’s terms.",
      ],
    },
    {
      heading: "10. Changes",
      paragraphs: [
        "We may update this Privacy Policy. The “Last updated” date will change when we do. Important changes will be reflected on this page.",
      ],
    },
    {
      heading: "11. Contact",
      paragraphs: [
        "Privacy questions: reach the Wondrix team through the Dubai Create programme channels used for this project, or via the contact details published on the Wondrix website when available.",
      ],
    },
  ],
};

const TERMS_AR: LegalDoc = {
  title: "شروط الاستخدام",
  updated: "آخر تحديث: 16 نوفمبر 2026",
  intro:
    "مرحبًا بك في ووندريكس. توضّح شروط الاستخدام هذه كيف يمكن للعائلات استخدام تطبيق ووندريكس وموقعه. باستخدام ووندريكس، يقبل ولي الأمر هذه الشروط عن نفسه وعن أي ملف طفل ينشئه.",
  sections: [
    {
      heading: "1. من نحن",
      paragraphs: [
        "ووندريكس رفيق تعلّم للأطفال وأولياء الأمور. يقدّم تمارين المدرسة، واستكشاف (محادثة الفضول)، ولوحة ولي الأمر. بُني ووندريكس لبطولة دبي لإنشاء وكلاء الذكاء الاصطناعي مع غرفة دبي للاقتصاد الرقمي.",
        "تنطبق هذه الشروط على تطبيق ووندريكس على الويب والصفحات المرتبطة (بما فيها الموقع وشروط الاستخدام والخصوصية).",
      ],
    },
    {
      heading: "2. من يجوز له الاستخدام",
      paragraphs: [
        "يجب أن يضبط ولي الأمر ووندريكس وينشئ ملفات الأطفال. يستخدم الأطفال المدرسة والاستكشاف تحت إشرافه.",
        "قدّم معلومات دقيقة في إعدادات ولي الأمر (مثل الاسم المستعار والفئة العمرية والسنة الدراسية) ليبقى التدريب مناسبًا.",
      ],
    },
    {
      heading: "3. ماذا يفعل ووندريكس",
      paragraphs: [
        "تساعد المدرسة على التدرّب على مهارات بأسلوب المنهج عبر اختبارات وقراءة وفحوصات للفجوات. يجيب الاستكشاف عن أسئلة الفضول بنص وصوت اختياري وصور بسيطة. تتيح لوحة ولي الأمر توجيه الصف والمواد ووضع الهدوء وأدوات الأمان.",
        "قد تأتي الإجابات من منطق على الجهاز أو من خدمات ذكاء اصطناعي نضبطها. قد يكون المحتوى خاطئًا أو ناقصًا. ووندريكس وسيلة مساعدة للتعلّم، وليس مدرسة أو بديلاً عن معلّم، ولا خدمة طبية أو قانونية أو طارئة.",
      ],
    },
    {
      heading: "4. مسؤولية ولي الأمر",
      paragraphs: [
        "أنت مسؤول عن الجهاز وكلمة مرور ولي الأمر وكيف يستخدم طفلك ووندريكس. احفظ رمز ولي الأمر بسرية. راجع ملخصات ولي الأمر وأدوات الأمان بانتظام.",
        "أنت تقرر ما إذا كان الصوت والميكروفون والصور (مثل صور الكتاب) تُستخدم على جهازك.",
      ],
    },
    {
      heading: "5. الاستخدام المقبول",
      paragraphs: [
        "لا تستخدم ووندريكس لإيذاء الآخرين أو مخالفة القانون أو تجاوز توجيهات الأمان أو مهاجمة خدماتنا أو رفع محتوى غير قانوني أو مسيء.",
        "قد نقيّد أو نوقف الوصول إذا كان الاستخدام مسيئًا أو غير آمن أو يخالف هذه الشروط.",
      ],
    },
    {
      heading: "6. الأمان وحدود المحتوى",
      paragraphs: [
        "يحاول الاستكشاف توجيه المواضيع غير الآمنة إلى مواضيع أكثر أمانًا وقد يسجّل حدوث التوجيه لملخص ولي الأمر. فلاتر الأمان مفيدة وليست كاملة. ابقَ قريبًا عندما يدردش طفل صغير.",
        "أسئلة المدرسة مصمّمة للتدرّب. ليست اختبارًا رسميًا أو شهادة منهج.",
      ],
    },
    {
      heading: "7. الحسابات والبيانات على الجهاز والتوفّر",
      paragraphs: [
        "يخزّن العرض التوضيحي الحالي كثيرًا من بيانات الأسرة والتعلّم في متصفح جهازك (التخزين المحلي). مسح بيانات الموقع قد يمحو الملفات والمحادثات والتقدّم.",
        "قد نغيّر الميزات أو نوقفها أو ننهيها أثناء تحسين المنتج. لا نعد بخدمة بلا انقطاع أو بلا أخطاء.",
      ],
    },
    {
      heading: "8. الملكية الفكرية",
      paragraphs: [
        "علامة ووندريكس وفن شخصية البومة وتصميم التطبيق تخص مشروع ووندريكس ومنشقيه. يمكنك استخدام التطبيق لتعلّم الأسرة الشخصي. لا تنسخ أو تبيع أو تفكّك الخدمة لمنتج منافس دون إذن.",
      ],
    },
    {
      heading: "9. إخلاء المسؤولية",
      paragraphs: [
        "يُقدَّم ووندريكس «كما هو» للاستخدام التعليمي والعرض. إلى أقصى حد يسمح به القانون، نخلي مسؤوليتنا عن ضمانات الملاءمة لغرض معيّن وعدم التعدي.",
        "لسنا مسؤولين عن نتائج التعلّم أو الاختبارات أو القرارات المبنية على محتوى التطبيق، أو عن فقدان البيانات المحلية على جهازك.",
      ],
    },
    {
      heading: "10. التغييرات",
      paragraphs: [
        "قد نحدّث هذه الشروط. يتغيّر تاريخ «آخر تحديث» عند ذلك. استمرار الاستخدام بعد التحديث يعني قبولك الشروط الجديدة.",
      ],
    },
    {
      heading: "11. التواصل",
      paragraphs: [
        "لأسئلة حول هذه الشروط: استخدم قنوات برنامج دبي لإنشاء الوكلاء المعتمدة لووندريكس، أو بيانات التواصل المنشورة على موقع ووندريكس عند توفّرها.",
      ],
    },
  ],
};

const PRIVACY_AR: LegalDoc = {
  title: "سياسة الخصوصية",
  updated: "آخر تحديث: 16 نوفمبر 2026",
  intro:
    "توضّح سياسة الخصوصية هذه ما يجمعه ووندريكس ولماذا وكيف يبقى ولي الأمر مسيطرًا. ووندريكس مبني للعائلات. نسعى لإبقاء بيانات الأطفال في الحد الأدنى وبشكل مفهوم.",
  sections: [
    {
      heading: "1. النطاق",
      paragraphs: [
        "تغطي هذه السياسة تطبيق ووندريكس على الويب والصفحات المرتبطة. كُتبت لأولياء الأمور بلغة واضحة.",
      ],
    },
    {
      heading: "2. البيانات التي نعالجها",
      paragraphs: [
        "على جهازك (تخزين المتصفح المحلي) قد يحفظ ووندريكس: أسماء الأطفال المستعارة، الأعمار، الصف أو السنة، المنهج، المواد، وضع الهدوء، المظهر واللغة، التقدّم في التمارين، سجل محادثات الاستكشاف للأسرة، عدد توجيهات الأمان، رمز ولي الأمر، وصور الكتاب الاختيارية التي تضيفها، وإعدادات مشابهة.",
        "إذا استخدمت ميزات الصوت، تُعالَج الصوت للتحدّث أو لتحويل الكلام إلى نص. حسب الإعداد، قد يُستخدم صوت النظام أو نموذج صوت في المتصفح و/أو خدمة سحابية للكلام (مثل Azure Speech عند تفعيلها).",
        "إذا فُعّل الدردشة أو التخطيط بالذكاء الاصطناعي، قد يُرسل نص السؤال وسياق محدود (مثل الفئة العمرية أو الجولات الأخيرة) إلى مزوّد ذكاء اصطناعي ليرد ووندريكس. نطلب من المزوّدين عدم استخدام ذلك لتدريب نماذجهم العامة حيث يسمح الإعداد بذلك.",
      ],
    },
    {
      heading: "3. لماذا نستخدم البيانات",
      paragraphs: [
        "لتشغيل المدرسة والاستكشاف لطفلك، وملاءمة الصعوبة واللغة، وإبقاء أدوات ولي الأمر تعمل، وعرض ملخصات الأمان والتعلّم، وتحسين الموثوقية أثناء العروض والاختبارات.",
        "لا نبيع المعلومات الشخصية للأطفال. ولا نستخدم بيانات ووندريكس لإعلانات طرف ثالث.",
      ],
    },
    {
      heading: "4. الأطفال",
      paragraphs: [
        "ووندريكس مخصّص للأطفال مع حساب ولي أمر. ينشئ ولي الأمر الملفات ويديرها. لا تُدخل الاسم القانوني الكامل للطفل أو رقم المدرسة أو العنوان أو تفاصيل هوية حسّاسة في الحقول الحرة إلا إذا اخترت ذلك.",
        "يحاول الاستكشاف تجنّب المواضيع غير الآمنة. يبقى إشراف ولي الأمر مهمًا مع الأطفال الصغار.",
      ],
    },
    {
      heading: "5. المشاركة",
      paragraphs: [
        "قد نشارك بيانات تقنية مع مزوّدي البنية أو الذكاء الاصطناعي / الكلام فقط بقدر ما يلزم لتقديم الميزة التي استخدمتها (مثل توليد إجابة أو تشغيل صوت عصبي).",
        "قد نكشف معلومات إذا طلب القانون ذلك أو لحماية طفل أو آخرين من ضرر جسيم.",
      ],
    },
    {
      heading: "6. التخزين والاحتفاظ",
      paragraphs: [
        "تخزّن نسخ العرض التوضيحي بيانات الأسرة أساسًا على الجهاز. يمكنك مسحها عبر مسح بيانات الموقع في المتصفح أو إعادة ضبط تخزين التطبيق.",
        "تُحفظ سجلات الخادم لطلبات الواجهة (إن وُجدت) للوقت اللازم للأمان والتشخيص ثم تُحذف في التشغيل العادي.",
      ],
    },
    {
      heading: "7. الأمان",
      paragraphs: [
        "نستخدم رمز ولي الأمر لتقييد الوصول إلى إعدادات ولي الأمر على الجهاز المشترك. لا توجد طريقة مثالية. استخدم قفل شاشة الجهاز أيضًا.",
        "تجنّب استخدام ووندريكس على جهاز عام إذا كنت لا تريد ترك ملفات محلية عليه.",
      ],
    },
    {
      heading: "8. خياراتك",
      paragraphs: [
        "في لوحة ولي الأمر يمكنك تعديل أو حذف تفاصيل الطفل التي أضفتها، وتغيير اللغة والمظهر، ومراجعة معلومات الأمان. يمكنك إيقاف الصوت أو الميكروفون في أي وقت.",
        "يمكنك طلب حذف بيانات من الخادم مرتبطة بحساب سحابي مستقبلي بالتواصل معنا عند وجود ذلك النظام. في العرض الحالي على الجهاز، مسح بيانات الموقع يزيل نسخة الأسرة على ذلك المتصفح.",
      ],
    },
    {
      heading: "9. الاستخدام الدولي",
      paragraphs: [
        "يُعرض ووندريكس في الإمارات (دبي كرييت). إذا كان مزوّدو الذكاء الاصطناعي أو الكلام خارج الإمارات، قد تُعالَج البيانات اللازمة لذلك الطلب في تلك المناطق وفق شروط المزوّد.",
      ],
    },
    {
      heading: "10. التغييرات",
      paragraphs: [
        "قد نحدّث سياسة الخصوصية هذه. يتغيّر تاريخ «آخر تحديث» عند ذلك. ستظهر التغييرات المهمة في هذه الصفحة.",
      ],
    },
    {
      heading: "11. التواصل",
      paragraphs: [
        "لأسئلة الخصوصية: تواصل مع فريق ووندريكس عبر قنوات برنامج دبي لإنشاء الوكلاء المعتمدة لهذا المشروع، أو عبر بيانات التواصل المنشورة على موقع ووندريكس عند توفّرها.",
      ],
    },
  ],
};

export function getTerms(lang: Lang): LegalDoc {
  return lang === "ar" ? TERMS_AR : TERMS_EN;
}

export function getPrivacy(lang: Lang): LegalDoc {
  return lang === "ar" ? PRIVACY_AR : PRIVACY_EN;
}
