import { createContext, useContext, useState, ReactNode } from "react";

export type LangCode = "EN" | "AR" | "NP" | "IT" | "VI";

interface LanguageContextType {
  lang: LangCode;
  setLang: (code: LangCode) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "EN",
  setLang: () => {},
  t: (k) => k,
  dir: "ltr",
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<LangCode>("EN");

  const t = (key: string): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry.EN || key;
  };

  const dir = lang === "AR" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

type Translations = Record<string, Record<LangCode, string>>;

export const translations: Translations = {
  // TopBar
  "topbar.email": { EN: "admin@northerncommunitycaresa.org.au", AR: "admin@northerncommunitycaresa.org.au", NP: "admin@northerncommunitycaresa.org.au", IT: "admin@northerncommunitycaresa.org.au", VI: "admin@northerncommunitycaresa.org.au" },
  "topbar.location": { EN: "Northern Adelaide, SA · 100% Free", AR: "شمال أديلايد، جنوب أستراليا · مجاني 100%", NP: "उत्तरी एडिलेड, SA · १००% निःशुल्क", IT: "Adelaide Nord, SA · 100% Gratuito", VI: "Bắc Adelaide, SA · Miễn phí 100%" },

  // Nav
  "nav.getHelp": { EN: "Get Help", AR: "احصل على مساعدة", NP: "सहायता पाउनुहोस्", IT: "Ottieni Aiuto", VI: "Nhận Trợ Giúp" },
  "nav.howItWorks": { EN: "How It Works", AR: "كيف يعمل", NP: "यो कसरी काम गर्छ", IT: "Come Funziona", VI: "Cách Hoạt Động" },
  "nav.volunteer": { EN: "Volunteer", AR: "تطوع", NP: "स्वयंसेवक", IT: "Volontariato", VI: "Tình Nguyện" },
  "nav.about": { EN: "About", AR: "عن المنظمة", NP: "हाम्रो बारेमा", IT: "Chi Siamo", VI: "Giới Thiệu" },
  "nav.getFreeHelp": { EN: "🌿 Get Free Help", AR: "🌿 احصل على مساعدة مجانية", NP: "🌿 निःशुल्क सहायता पाउनुहोस्", IT: "🌿 Aiuto Gratuito", VI: "🌿 Nhận Trợ Giúp Miễn Phí" },
  "nav.orgName": { EN: "Northern Community Care SA", AR: "رعاية مجتمع شمال أديلايد", NP: "उत्तरी सामुदायिक हेरचाह SA", IT: "Northern Community Care SA", VI: "Northern Community Care SA" },
  "nav.orgSub": { EN: "Free Family Support · Northern Adelaide", AR: "دعم الأسرة المجاني · شمال أديلايد", NP: "निःशुल्क पारिवारिक सहायता · उत्तरी एडिलेड", IT: "Supporto Familiare Gratuito · Adelaide Nord", VI: "Hỗ Trợ Gia Đình Miễn Phí · Bắc Adelaide" },

  // Hero
  "hero.orgLabel": { EN: "Northern Community Care SA Inc", AR: "مؤسسة رعاية مجتمع شمال أديلايد", NP: "नर्दर्न कम्युनिटी केयर SA Inc", IT: "Northern Community Care SA Inc", VI: "Northern Community Care SA Inc" },
  "hero.badge": { EN: "Northern Adelaide · 100% Free · No myGov Needed · Registered Charity", AR: "شمال أديلايد · مجاني 100% · لا تحتاج myGov · جمعية خيرية مسجلة", NP: "उत्तरी एडिलेड · १००% निःशुल्क · myGov चाहिँदैन · दर्ता भएको चैरिटी", IT: "Adelaide Nord · 100% Gratuito · Nessun myGov Necessario · Ente Registrato", VI: "Bắc Adelaide · Miễn phí 100% · Không cần myGov · Tổ chức từ thiện" },
  "hero.headline1": { EN: "Your family deserves", AR: "عائلتك تستحق", NP: "तपाईंको परिवारले पाउनुपर्छ", IT: "La tua famiglia merita", VI: "Gia đình bạn xứng đáng" },
  "hero.headline2": { EN: "more", AR: "أكثر", NP: "अधिक", IT: "di più", VI: "nhiều hơn" },
  "hero.headline3": { EN: "than you know", AR: "مما تعلم", NP: "तपाईंलाई थाहा भन्दा", IT: "di quanto pensi", VI: "bạn nghĩ" },
  "hero.subheading": { EN: "We guide families through Centrelink, Medicare, NDIS and aged care — in your language, step by step, completely free. No myGov account needed.", AR: "نوجه العائلات عبر Centrelink و Medicare و NDIS ورعاية المسنين — بلغتك، خطوة بخطوة، مجاناً تماماً. لا تحتاج حساب myGov.", NP: "हामी परिवारहरूलाई Centrelink, Medicare, NDIS र वृद्ध हेरचाहमा मार्गदर्शन गर्छौं — तपाईंको भाषामा, चरणबद्ध रूपमा, पूर्ण निःशुल्क। myGov खाता चाहिँदैन।", IT: "Guidiamo le famiglie attraverso Centrelink, Medicare, NDIS e assistenza anziani — nella tua lingua, passo dopo passo, completamente gratuito. Nessun account myGov necessario.", VI: "Chúng tôi hướng dẫn gia đình qua Centrelink, Medicare, NDIS và chăm sóc người cao tuổi — bằng ngôn ngữ của bạn, từng bước một, hoàn toàn miễn phí. Không cần tài khoản myGov." },
  "hero.chooseLang": { EN: "Choose your language to begin", AR: "اختر لغتك للبدء", NP: "सुरु गर्न आफ्नो भाषा छान्नुहोस्", IT: "Scegli la tua lingua per iniziare", VI: "Chọn ngôn ngữ của bạn để bắt đầu" },
  "hero.langNote": { EN: "The whole site switches to your language — every question, every document, your entire summary.", AR: "الموقع بالكامل يتحول إلى لغتك — كل سؤال، كل وثيقة، ملخصك بالكامل.", NP: "पूरा साइट तपाईंको भाषामा बदलिन्छ — हरेक प्रश्न, हरेक कागजात, तपाईंको पूरा सारांश।", IT: "L'intero sito passa alla tua lingua — ogni domanda, ogni documento, l'intero riepilogo.", VI: "Toàn bộ trang web chuyển sang ngôn ngữ của bạn — mọi câu hỏi, mọi tài liệu, toàn bộ bản tóm tắt." },
  "hero.everything": { EN: "Everything.", AR: "كل شيء.", NP: "सबैकुरा।", IT: "Tutto.", VI: "Mọi thứ." },
  "hero.servicesHeading": { EN: "Choose your form — Luma prepares everything", AR: "اختر النموذج — لوما تجهز كل شيء", NP: "आफ्नो फारम छान्नुहोस् — Luma ले सबै तयार गर्छ", IT: "Scegli il tuo modulo — Luma prepara tutto", VI: "Chọn biểu mẫu của bạn — Luma chuẩn bị tất cả" },
  "hero.getStarted": { EN: "Get started →", AR: "ابدأ الآن →", NP: "सुरु गर्नुहोस् →", IT: "Inizia →", VI: "Bắt đầu →" },
  "hero.safetyTitle": { EN: "Your information is completely safe with us", AR: "معلوماتك آمنة تماماً معنا", NP: "तपाईंको जानकारी हामीसँग पूर्ण सुरक्षित छ", IT: "Le tue informazioni sono completamente al sicuro con noi", VI: "Thông tin của bạn hoàn toàn an toàn với chúng tôi" },
  "hero.safetyDesc": { EN: "Registered not-for-profit. We never share your information with immigration, police or any government agency. Documents read by Luma and immediately deleted. No connection to the Department of Home Affairs.", AR: "منظمة غير ربحية مسجلة. لا نشارك معلوماتك أبداً مع الهجرة أو الشرطة أو أي جهة حكومية. يتم حذف المستندات فوراً بعد قراءتها.", NP: "दर्ता भएको गैर-नाफामूलक। हामी तपाईंको जानकारी कहिल्यै आप्रवासन, प्रहरी वा कुनै सरकारी निकायसँग साझा गर्दैनौं। कागजातहरू तुरुन्तै मेटिन्छन्।", IT: "Organizzazione no-profit registrata. Non condividiamo mai le tue informazioni con immigrazione, polizia o agenzie governative. I documenti vengono eliminati immediatamente.", VI: "Tổ chức phi lợi nhuận đã đăng ký. Chúng tôi không bao giờ chia sẻ thông tin của bạn với cơ quan nhập cư, cảnh sát hay bất kỳ cơ quan chính phủ nào. Tài liệu được xóa ngay lập tức." },
  "hero.lumaGreeting": { EN: "Hi, I'm Luma ✨", AR: "✨ مرحباً، أنا لوما", NP: "नमस्ते, म Luma हुँ ✨", IT: "Ciao, sono Luma ✨", VI: "Xin chào, tôi là Luma ✨" },
  "hero.lumaTag": { EN: "Your free NCCSA guide", AR: "دليلك المجاني من NCCSA", NP: "तपाईंको निःशुल्क NCCSA गाइड", IT: "La tua guida NCCSA gratuita", VI: "Hướng dẫn NCCSA miễn phí của bạn" },
  "hero.lumaOnline": { EN: "Online now · Arabic, Nepali, Italian, Vietnamese & English", AR: "متصل الآن · عربي، نيبالي، إيطالي، فيتنامي وإنجليزي", NP: "अहिले अनलाइन · अरबी, नेपाली, इटालियन, भियतनामी र अंग्रेजी", IT: "Online ora · Arabo, Nepalese, Italiano, Vietnamita e Inglese", VI: "Trực tuyến · Tiếng Ả Rập, Nepal, Ý, Việt & Anh" },
  "hero.lumaFooter": { EN: "Luma speaks your language · fills your forms ·", AR: "لوما تتحدث لغتك · تملأ نماذجك ·", NP: "Luma तपाईंको भाषा बोल्छ · फारम भर्छ ·", IT: "Luma parla la tua lingua · compila i tuoi moduli ·", VI: "Luma nói ngôn ngữ của bạn · điền biểu mẫu ·" },
  "hero.completelyFree": { EN: "completely free", AR: "مجاني بالكامل", NP: "पूर्ण निःशुल्क", IT: "completamente gratuito", VI: "hoàn toàn miễn phí" },
  "hero.startWithLuma": { EN: "✨ Start with Luma →", AR: "✨ ابدأ مع لوما →", NP: "✨ Luma सँग सुरु गर्नुहोस् →", IT: "✨ Inizia con Luma →", VI: "✨ Bắt đầu với Luma →" },

  // Trust items
  "trust.free": { EN: "100% Free", AR: "مجاني 100%", NP: "१००% निःशुल्क", IT: "100% Gratuito", VI: "Miễn phí 100%" },
  "trust.freeSub": { EN: "No fees, ever", AR: "بدون رسوم أبداً", NP: "कुनै शुल्क छैन", IT: "Nessun costo, mai", VI: "Không phí, mãi mãi" },
  "trust.private": { EN: "Private & Secure", AR: "خاص وآمن", NP: "निजी र सुरक्षित", IT: "Privato e Sicuro", VI: "Riêng tư & An toàn" },
  "trust.privateSub": { EN: "Docs deleted instantly", AR: "يتم حذف المستندات فوراً", NP: "कागजात तुरुन्तै मेटिन्छ", IT: "Documenti eliminati subito", VI: "Tài liệu xóa ngay" },
  "trust.noMyGov": { EN: "No myGov Needed", AR: "لا تحتاج myGov", NP: "myGov चाहिँदैन", IT: "Nessun myGov", VI: "Không cần myGov" },
  "trust.noMyGovSub": { EN: "Postal route available", AR: "طريق البريد متاح", NP: "हुलाक मार्ग उपलब्ध", IT: "Via postale disponibile", VI: "Đường bưu điện có sẵn" },
  "trust.charity": { EN: "Registered Charity", AR: "جمعية خيرية مسجلة", NP: "दर्ता भएको चैरिटी", IT: "Ente Registrato", VI: "Tổ chức từ thiện" },
  "trust.charitySub": { EN: "Northern Adelaide", AR: "شمال أديلايد", NP: "उत्तरी एडिलेड", IT: "Adelaide Nord", VI: "Bắc Adelaide" },
  "trust.languages": { EN: "5 Languages", AR: "٥ لغات", NP: "५ भाषाहरू", IT: "5 Lingue", VI: "5 Ngôn ngữ" },
  "trust.languagesSub": { EN: "Full site translation", AR: "ترجمة كاملة للموقع", NP: "पूर्ण साइट अनुवाद", IT: "Traduzione completa del sito", VI: "Dịch toàn bộ trang" },

  // Services
  "service.dsp": { EN: "Disability Support Pension", AR: "معاش دعم الإعاقة", NP: "अपाङ्गता सहायता पेन्सन", IT: "Pensione di Sostegno alla Disabilità", VI: "Trợ cấp Hỗ trợ Người khuyết tật" },
  "service.medicare": { EN: "Medicare Enrolment", AR: "التسجيل في Medicare", NP: "Medicare दर्ता", IT: "Iscrizione Medicare", VI: "Đăng ký Medicare" },
  "service.ndis": { EN: "NDIS Access Request", AR: "طلب الوصول إلى NDIS", NP: "NDIS पहुँच अनुरोध", IT: "Richiesta Accesso NDIS", VI: "Yêu cầu Truy cập NDIS" },
  "service.agedCare": { EN: "Aged Care Assessment", AR: "تقييم رعاية المسنين", NP: "वृद्ध हेरचाह मूल्यांकन", IT: "Valutazione Assistenza Anziani", VI: "Đánh giá Chăm sóc Người cao tuổi" },
  "service.carer": { EN: "Carer Payment", AR: "دفع مقدم الرعاية", NP: "हेरचाहकर्ता भुक्तानी", IT: "Pagamento Assistente", VI: "Trợ cấp Người chăm sóc" },
  "service.agePension": { EN: "Age Pension", AR: "معاش الشيخوخة", NP: "वृद्धावस्था पेन्सन", IT: "Pensione di Vecchiaia", VI: "Lương hưu Tuổi già" },

  // Service descriptions
  "service.dsp.desc": { EN: "A fortnightly payment for people who have a permanent physical, intellectual or psychiatric condition that stops them from working.", AR: "دفعة نصف شهرية للأشخاص الذين لديهم حالة جسدية أو ذهنية أو نفسية دائمة تمنعهم من العمل.", NP: "स्थायी शारीरिक, बौद्धिक वा मानसिक अवस्था भएका व्यक्तिहरूको लागि पाक्षिक भुक्तानी।", IT: "Un pagamento quindicinale per chi ha una condizione fisica, intellettuale o psichiatrica permanente che impedisce di lavorare.", VI: "Khoản thanh toán hai tuần một lần cho người có tình trạng thể chất, trí tuệ hoặc tâm thần vĩnh viễn ngăn họ làm việc." },
  "service.medicare.desc": { EN: "Australia's public health system. Medicare covers doctor visits, hospital care and some medicines — completely free.", AR: "نظام الصحة العامة في أستراليا. يغطي Medicare زيارات الطبيب والرعاية في المستشفى وبعض الأدوية — مجاناً تماماً.", NP: "अस्ट्रेलियाको सार्वजनिक स्वास्थ्य प्रणाली। Medicare ले डाक्टर भ्रमण, अस्पताल हेरचाह र केही औषधिहरू — पूर्ण निःशुल्क कभर गर्छ।", IT: "Il sistema sanitario pubblico australiano. Medicare copre visite mediche, cure ospedaliere e alcuni farmaci — completamente gratuito.", VI: "Hệ thống y tế công cộng của Úc. Medicare bao gồm khám bác sĩ, chăm sóc bệnh viện và một số thuốc — hoàn toàn miễn phí." },
  "service.ndis.desc": { EN: "The National Disability Insurance Scheme provides funding for support and services if you have a permanent and significant disability.", AR: "يوفر NDIS تمويلاً للدعم والخدمات إذا كان لديك إعاقة دائمة وكبيرة.", NP: "NDIS ले स्थायी र महत्वपूर्ण अपाङ्गता भएमा सहायता र सेवाहरूको लागि कोष प्रदान गर्दछ।", IT: "L'NDIS fornisce finanziamenti per supporto e servizi se hai una disabilità permanente e significativa.", VI: "NDIS cung cấp tài trợ cho hỗ trợ và dịch vụ nếu bạn có khuyết tật vĩnh viễn và đáng kể." },
  "service.agedCare.desc": { EN: "Get assessed for home care or residential aged care services. Support for daily tasks, meals, transport and personal care.", AR: "احصل على تقييم لخدمات الرعاية المنزلية أو رعاية المسنين السكنية. دعم للمهام اليومية والوجبات والنقل والرعاية الشخصية.", NP: "घरेलु हेरचाह वा आवासीय वृद्ध हेरचाह सेवाहरूको लागि मूल्यांकन गराउनुहोस्।", IT: "Fatti valutare per l'assistenza domiciliare o residenziale. Supporto per attività quotidiane, pasti, trasporto e cura personale.", VI: "Được đánh giá cho dịch vụ chăm sóc tại nhà hoặc chăm sóc người cao tuổi. Hỗ trợ công việc hàng ngày, bữa ăn, di chuyển và chăm sóc cá nhân." },
  "service.carer.desc": { EN: "A fortnightly payment for people who provide full-time care to someone with a disability, severe illness or who is frail aged.", AR: "دفعة نصف شهرية للأشخاص الذين يقدمون رعاية بدوام كامل لشخص يعاني من إعاقة أو مرض شديد.", NP: "अपाङ्गता, गम्भीर बिरामी वा वृद्ध व्यक्तिलाई पूर्णकालिन हेरचाह प्रदान गर्ने व्यक्तिहरूको लागि पाक्षिक भुक्तानी।", IT: "Un pagamento quindicinale per chi fornisce assistenza a tempo pieno a una persona con disabilità o grave malattia.", VI: "Khoản thanh toán hai tuần một lần cho người chăm sóc toàn thời gian người khuyết tật, bệnh nặng hoặc người cao tuổi." },
  "service.agePension.desc": { EN: "A fortnightly payment for Australians who have reached pension age (67+). Helps with living costs in retirement.", AR: "دفعة نصف شهرية للأستراليين الذين بلغوا سن التقاعد (67+). تساعد في تكاليف المعيشة.", NP: "पेन्सन उमेर (67+) पुगेका अस्ट्रेलियनहरूको लागि पाक्षिक भुक्तानी।", IT: "Un pagamento quindicinale per gli australiani che hanno raggiunto l'età pensionabile (67+).", VI: "Khoản thanh toán hai tuần một lần cho người Úc đã đến tuổi nghỉ hưu (67+)." },

  // Eligibility questions - DSP
  "q.dsp.1": { EN: "Do you have a permanent medical condition or disability?", AR: "هل لديك حالة طبية دائمة أو إعاقة؟", NP: "तपाईंलाई स्थायी चिकित्सा अवस्था वा अपाङ्गता छ?", IT: "Hai una condizione medica permanente o una disabilità?", VI: "Bạn có tình trạng bệnh lý vĩnh viễn hoặc khuyết tật không?" },
  "q.dsp.2": { EN: "Does it stop you working 15 or more hours per week?", AR: "هل يمنعك من العمل 15 ساعة أو أكثر في الأسبوع؟", NP: "के यसले तपाईंलाई हप्तामा 15 वा बढी घण्टा काम गर्न रोक्छ?", IT: "Ti impedisce di lavorare 15 o più ore a settimana?", VI: "Nó có ngăn bạn làm việc 15 giờ trở lên mỗi tuần không?" },
  "q.dsp.3": { EN: "Are you between 16 and Age Pension age?", AR: "هل عمرك بين 16 وسن معاش الشيخوخة؟", NP: "तपाईं 16 र वृद्धावस्था पेन्सन उमेर बीचमा हुनुहुन्छ?", IT: "Hai tra i 16 e l'età pensionabile?", VI: "Bạn có trong độ tuổi từ 16 đến tuổi nghỉ hưu không?" },
  "q.dsp.4": { EN: "Are you an Australian resident?", AR: "هل أنت مقيم في أستراليا؟", NP: "तपाईं अस्ट्रेलियाको बासिन्दा हुनुहुन्छ?", IT: "Sei residente in Australia?", VI: "Bạn có phải cư dân Úc không?" },
  "q.dsp.5": { EN: "Have you seen a doctor about this condition in the last 2 years?", AR: "هل زرت طبيباً بخصوص هذه الحالة في آخر سنتين؟", NP: "गत 2 वर्षमा तपाईंले यस अवस्थाको बारेमा डाक्टरलाई देखाउनुभएको छ?", IT: "Hai consultato un medico per questa condizione negli ultimi 2 anni?", VI: "Bạn đã gặp bác sĩ về tình trạng này trong 2 năm qua chưa?" },

  // Eligibility questions - Medicare
  "q.medicare.1": { EN: "Are you a new arrival to Australia?", AR: "هل أنت وافد جديد إلى أستراليا؟", NP: "तपाईं अस्ट्रेलियामा नयाँ आगमन हुनुहुन्छ?", IT: "Sei un nuovo arrivo in Australia?", VI: "Bạn có phải là người mới đến Úc không?" },
  "q.medicare.2": { EN: "Do you have a visa that allows Medicare?", AR: "هل لديك تأشيرة تسمح بالتسجيل في Medicare؟", NP: "तपाईंसँग Medicare अनुमति दिने भिसा छ?", IT: "Hai un visto che permette Medicare?", VI: "Bạn có visa cho phép Medicare không?" },
  "q.medicare.3": { EN: "Is your name spelled differently on different documents?", AR: "هل اسمك مكتوب بشكل مختلف في مستندات مختلفة؟", NP: "तपाईंको नाम विभिन्न कागजातहरूमा फरक फरक लेखिएको छ?", IT: "Il tuo nome è scritto diversamente su documenti diversi?", VI: "Tên bạn có được viết khác nhau trên các tài liệu khác nhau không?" },
  "q.medicare.4": { EN: "Do you need to add a family member?", AR: "هل تحتاج إلى إضافة فرد من العائلة؟", NP: "तपाईंले परिवारको सदस्य थप्नु पर्छ?", IT: "Devi aggiungere un familiare?", VI: "Bạn có cần thêm thành viên gia đình không?" },
  "q.medicare.5": { EN: "Do you have your passport and visa documents available?", AR: "هل لديك جواز سفرك ووثائق التأشيرة متاحة؟", NP: "तपाईंसँग पासपोर्ट र भिसा कागजातहरू उपलब्ध छन्?", IT: "Hai il passaporto e i documenti del visto disponibili?", VI: "Bạn có sẵn hộ chiếu và giấy tờ visa không?" },

  // Eligibility questions - NDIS
  "q.ndis.1": { EN: "Are you under 65 years old?", AR: "هل عمرك أقل من 65 سنة؟", NP: "तपाईं 65 वर्ष भन्दा कम हुनुहुन्छ?", IT: "Hai meno di 65 anni?", VI: "Bạn dưới 65 tuổi phải không?" },
  "q.ndis.2": { EN: "Do you have a permanent disability affecting daily life?", AR: "هل لديك إعاقة دائمة تؤثر على الحياة اليومية؟", NP: "तपाईंलाई दैनिक जीवनमा प्रभाव पार्ने स्थायी अपाङ्गता छ?", IT: "Hai una disabilità permanente che influisce sulla vita quotidiana?", VI: "Bạn có khuyết tật vĩnh viễn ảnh hưởng đến cuộc sống hàng ngày không?" },
  "q.ndis.3": { EN: "Are you an Australian citizen or permanent resident?", AR: "هل أنت مواطن أسترالي أو مقيم دائم؟", NP: "तपाईं अस्ट्रेलियाली नागरिक वा स्थायी बासिन्दा हुनुहुन्छ?", IT: "Sei cittadino australiano o residente permanente?", VI: "Bạn có phải công dân Úc hoặc thường trú nhân không?" },
  "q.ndis.4": { EN: "Do you need support with daily activities, communication or mobility?", AR: "هل تحتاج دعماً في الأنشطة اليومية أو التواصل أو التنقل؟", NP: "तपाईंलाई दैनिक गतिविधि, सञ्चार वा गतिशीलतामा सहायता चाहिन्छ?", IT: "Hai bisogno di supporto per attività quotidiane, comunicazione o mobilità?", VI: "Bạn có cần hỗ trợ hoạt động hàng ngày, giao tiếp hoặc di chuyển không?" },
  "q.ndis.5": { EN: "Do you have a letter or report from a doctor or specialist?", AR: "هل لديك رسالة أو تقرير من طبيب أو أخصائي؟", NP: "तपाईंसँग डाक्टर वा विशेषज्ञबाट पत्र वा रिपोर्ट छ?", IT: "Hai una lettera o un rapporto da un medico o specialista?", VI: "Bạn có thư hoặc báo cáo từ bác sĩ hoặc chuyên gia không?" },

  // Eligibility questions - Aged Care
  "q.agedCare.1": { EN: "Are you or a family member over 65?", AR: "هل أنت أو أحد أفراد عائلتك فوق 65 سنة؟", NP: "तपाईं वा परिवारको सदस्य 65 भन्दा माथि हुनुहुन्छ?", IT: "Tu o un familiare avete più di 65 anni?", VI: "Bạn hoặc thành viên gia đình trên 65 tuổi?" },
  "q.agedCare.2": { EN: "Do you need help at home with daily tasks?", AR: "هل تحتاج مساعدة في المنزل مع المهام اليومية؟", NP: "तपाईंलाई घरमा दैनिक कामहरूमा सहायता चाहिन्छ?", IT: "Hai bisogno di aiuto a casa con le attività quotidiane?", VI: "Bạn có cần giúp đỡ ở nhà với công việc hàng ngày không?" },
  "q.agedCare.3": { EN: "Are you considering moving to a care facility?", AR: "هل تفكر في الانتقال إلى مرفق رعاية؟", NP: "तपाईं हेरचाह सुविधामा सर्ने बारेमा सोच्दै हुनुहुन्छ?", IT: "Stai considerando di trasferirti in una struttura di cura?", VI: "Bạn có đang cân nhắc chuyển đến cơ sở chăm sóc không?" },
  "q.agedCare.4": { EN: "Are you an Australian resident?", AR: "هل أنت مقيم في أستراليا؟", NP: "तपाईं अस्ट्रेलियाको बासिन्दा हुनुहुन्छ?", IT: "Sei residente in Australia?", VI: "Bạn có phải cư dân Úc không?" },
  "q.agedCare.5": { EN: "Has a doctor recommended additional support?", AR: "هل أوصى طبيب بدعم إضافي؟", NP: "के डाक्टरले थप सहायताको सिफारिस गर्नुभएको छ?", IT: "Un medico ha raccomandato supporto aggiuntivo?", VI: "Bác sĩ có khuyến nghị hỗ trợ thêm không?" },

  // Eligibility questions - Carer
  "q.carer.1": { EN: "Do you provide full-time care for a family member?", AR: "هل تقدم رعاية بدوام كامل لأحد أفراد العائلة؟", NP: "तपाईंले परिवारको सदस्यलाई पूर्णकालिन हेरचाह प्रदान गर्नुहुन्छ?", IT: "Fornisci assistenza a tempo pieno a un familiare?", VI: "Bạn có chăm sóc toàn thời gian cho thành viên gia đình không?" },
  "q.carer.2": { EN: "Does the person you care for have a disability, illness or age-related condition?", AR: "هل يعاني الشخص الذي ترعاه من إعاقة أو مرض أو حالة مرتبطة بالعمر؟", NP: "तपाईंले हेरचाह गर्ने व्यक्तिलाई अपाङ्गता, बिरामी वा उमेर सम्बन्धी अवस्था छ?", IT: "La persona che assisti ha una disabilità, malattia o condizione legata all'età?", VI: "Người bạn chăm sóc có khuyết tật, bệnh tật hoặc tình trạng liên quan đến tuổi tác không?" },
  "q.carer.3": { EN: "Are you an Australian resident?", AR: "هل أنت مقيم في أستراليا؟", NP: "तपाईं अस्ट्रेलियाको बासिन्दा हुनुहुन्छ?", IT: "Sei residente in Australia?", VI: "Bạn có phải cư dân Úc không?" },
  "q.carer.4": { EN: "Are you available to provide care every day?", AR: "هل أنت متاح لتقديم الرعاية كل يوم؟", NP: "तपाईं हरेक दिन हेरचाह प्रदान गर्न उपलब्ध हुनुहुन्छ?", IT: "Sei disponibile a fornire assistenza ogni giorno?", VI: "Bạn có sẵn sàng chăm sóc mỗi ngày không?" },
  "q.carer.5": { EN: "Are you currently working less than 25 hours per week outside of caring?", AR: "هل تعمل حالياً أقل من 25 ساعة في الأسبوع خارج الرعاية؟", NP: "तपाईं हाल हेरचाह बाहेक हप्तामा 25 घण्टा भन्दा कम काम गर्दै हुनुहुन्छ?", IT: "Lavori attualmente meno di 25 ore a settimana al di fuori dell'assistenza?", VI: "Bạn hiện đang làm việc dưới 25 giờ mỗi tuần ngoài việc chăm sóc?" },

  // Eligibility questions - Age Pension
  "q.agePension.1": { EN: "Are you 67 years or older?", AR: "هل عمرك 67 سنة أو أكثر؟", NP: "तपाईं 67 वर्ष वा बढी हुनुहुन्छ?", IT: "Hai 67 anni o più?", VI: "Bạn 67 tuổi trở lên phải không?" },
  "q.agePension.2": { EN: "Are you an Australian resident and have lived here for 10 or more years?", AR: "هل أنت مقيم في أستراليا وعشت هنا لمدة 10 سنوات أو أكثر؟", NP: "तपाईं अस्ट्रेलियाको बासिन्दा हुनुहुन्छ र 10 वा बढी वर्ष यहाँ बस्नुभएको छ?", IT: "Sei residente in Australia e hai vissuto qui per 10 o più anni?", VI: "Bạn có phải cư dân Úc và đã sống ở đây 10 năm trở lên không?" },
  "q.agePension.3": { EN: "Do you own property or have savings above $500,000?", AR: "هل تملك عقاراً أو لديك مدخرات تزيد عن 500,000 دولار؟", NP: "तपाईंसँग सम्पत्ति छ वा $500,000 भन्दा बढी बचत छ?", IT: "Possiedi proprietà o hai risparmi superiori a $500.000?", VI: "Bạn có sở hữu bất động sản hoặc tiết kiệm trên $500,000 không?" },
  "q.agePension.4": { EN: "Are you currently receiving any other Centrelink payment?", AR: "هل تتلقى حالياً أي دفعة أخرى من Centrelink؟", NP: "तपाईं हाल अन्य Centrelink भुक्तानी प्राप्त गर्दै हुनुहुन्छ?", IT: "Stai attualmente ricevendo altri pagamenti Centrelink?", VI: "Bạn có đang nhận khoản thanh toán Centrelink khác không?" },
  "q.agePension.5": { EN: "Do you have your MyGov or Centrelink reference number?", AR: "هل لديك رقم مرجعي MyGov أو Centrelink؟", NP: "तपाईंसँग MyGov वा Centrelink सन्दर्भ नम्बर छ?", IT: "Hai il tuo numero di riferimento MyGov o Centrelink?", VI: "Bạn có số tham chiếu MyGov hoặc Centrelink không?" },

  // Eligibility messages
  "eligible.dsp": { EN: "Based on your answers, you are likely eligible for the Disability Support Pension. The next step is to prepare your form — I can help you with that right now.", AR: "بناءً على إجاباتك، من المحتمل أنك مؤهل لمعاش دعم الإعاقة. الخطوة التالية هي تحضير النموذج — يمكنني مساعدتك الآن.", NP: "तपाईंको उत्तरहरूको आधारमा, तपाईं अपाङ्गता सहायता पेन्सनको लागि योग्य हुन सक्नुहुन्छ। अर्को चरण भनेको फारम तयार गर्नु हो।", IT: "In base alle tue risposte, probabilmente hai diritto alla Pensione di Sostegno alla Disabilità. Il prossimo passo è preparare il modulo.", VI: "Dựa trên câu trả lời của bạn, bạn có thể đủ điều kiện nhận Trợ cấp Hỗ trợ Người khuyết tật. Bước tiếp theo là chuẩn bị biểu mẫu." },
  "notEligible.dsp": { EN: "Based on your answers, you may not be eligible right now. But don't worry — I can still help you explore other options. Would you like to look at a different payment?", AR: "بناءً على إجاباتك، قد لا تكون مؤهلاً الآن. لكن لا تقلق — يمكنني مساعدتك في استكشاف خيارات أخرى.", NP: "तपाईंको उत्तरहरूको आधारमा, तपाईं अहिले योग्य नहुन सक्नुहुन्छ। तर चिन्ता नगर्नुहोस् — म अन्य विकल्पहरू खोज्न मद्दत गर्न सक्छु।", IT: "In base alle tue risposte, potresti non essere idoneo ora. Ma non preoccuparti — posso aiutarti a esplorare altre opzioni.", VI: "Dựa trên câu trả lời của bạn, bạn có thể chưa đủ điều kiện. Nhưng đừng lo — tôi vẫn có thể giúp bạn tìm các lựa chọn khác." },
  "eligible.medicare": { EN: "Great news — it looks like you can enrol in Medicare. Let me help you prepare your enrolment form now.", AR: "أخبار رائعة — يبدو أنك تستطيع التسجيل في Medicare. دعني أساعدك في تحضير نموذج التسجيل.", NP: "राम्रो खबर — तपाईं Medicare मा दर्ता गर्न सक्नुहुन्छ। म तपाईंको दर्ता फारम तयार गर्न मद्दत गर्छु।", IT: "Ottime notizie — sembra che tu possa iscriverti a Medicare. Ti aiuto a preparare il modulo di iscrizione.", VI: "Tin tốt — có vẻ bạn có thể đăng ký Medicare. Để tôi giúp bạn chuẩn bị biểu mẫu đăng ký." },
  "notEligible.medicare": { EN: "You may need some extra documents before enrolling. I can help you work out what you need. Would you like me to explain?", AR: "قد تحتاج بعض المستندات الإضافية قبل التسجيل. يمكنني مساعدتك في معرفة ما تحتاجه.", NP: "दर्ता गर्नु अघि तपाईंलाई केही थप कागजातहरू चाहिन सक्छ।", IT: "Potresti aver bisogno di documenti aggiuntivi prima dell'iscrizione. Posso aiutarti a capire cosa ti serve.", VI: "Bạn có thể cần thêm một số tài liệu trước khi đăng ký. Tôi có thể giúp bạn tìm hiểu." },
  "eligible.ndis": { EN: "You look likely eligible for the NDIS. Let's prepare your access request form together.", AR: "يبدو أنك مؤهل لـ NDIS. دعنا نحضر نموذج طلب الوصول معاً.", NP: "तपाईं NDIS को लागि योग्य देखिनुहुन्छ। हामी सँगै पहुँच अनुरोध फारम तयार गरौं।", IT: "Sembra che tu sia idoneo per l'NDIS. Prepariamo insieme il modulo di richiesta accesso.", VI: "Bạn có vẻ đủ điều kiện cho NDIS. Hãy cùng chuẩn bị biểu mẫu yêu cầu truy cập." },
  "notEligible.ndis": { EN: "You may need some more information before applying. I can guide you on what to do next.", AR: "قد تحتاج بعض المعلومات الإضافية قبل التقديم. يمكنني إرشادك لما يجب فعله.", NP: "तपाईंलाई आवेदन गर्नु अघि केही थप जानकारी चाहिन सक्छ।", IT: "Potresti aver bisogno di più informazioni prima di fare domanda.", VI: "Bạn có thể cần thêm thông tin trước khi nộp đơn." },
  "eligible.agedCare": { EN: "It sounds like you qualify for an aged care assessment. Let me help you prepare the referral form.", AR: "يبدو أنك مؤهل لتقييم رعاية المسنين. دعني أساعدك في تحضير نموذج الإحالة.", NP: "तपाईं वृद्ध हेरचाह मूल्यांकनको लागि योग्य देखिनुहुन्छ।", IT: "Sembra che tu sia idoneo per una valutazione di assistenza anziani.", VI: "Có vẻ bạn đủ điều kiện đánh giá chăm sóc người cao tuổi." },
  "notEligible.agedCare": { EN: "You may not meet the criteria right now, but I can help you explore other support options.", AR: "قد لا تستوفي المعايير الآن، لكن يمكنني مساعدتك في استكشاف خيارات أخرى.", NP: "तपाईं अहिले मापदण्ड पूरा नगर्न सक्नुहुन्छ, तर म अन्य सहायता विकल्पहरू खोज्न मद्दत गर्न सक्छु।", IT: "Potresti non soddisfare i criteri ora, ma posso aiutarti a esplorare altre opzioni.", VI: "Bạn có thể chưa đáp ứng tiêu chí, nhưng tôi có thể giúp tìm các lựa chọn khác." },
  "eligible.carer": { EN: "You are likely eligible for the Carer Payment. Let me help you get your form ready.", AR: "من المحتمل أنك مؤهل لدفع مقدم الرعاية. دعني أساعدك في تحضير النموذج.", NP: "तपाईं हेरचाहकर्ता भुक्तानीको लागि योग्य हुन सक्नुहुन्छ।", IT: "Probabilmente hai diritto al Pagamento Assistente. Ti aiuto a preparare il modulo.", VI: "Bạn có thể đủ điều kiện nhận Trợ cấp Người chăm sóc." },
  "notEligible.carer": { EN: "You may not qualify for Carer Payment right now, but there could be other support available. Want me to check?", AR: "قد لا تكون مؤهلاً الآن، لكن قد يكون هناك دعم آخر متاح.", NP: "तपाईं अहिले योग्य नहुन सक्नुहुन्छ, तर अन्य सहायता उपलब्ध हुन सक्छ।", IT: "Potresti non essere idoneo ora, ma potrebbero esserci altri supporti disponibili.", VI: "Bạn có thể chưa đủ điều kiện, nhưng có thể có hỗ trợ khác." },
  "eligible.agePension": { EN: "Based on your answers, you are likely eligible for the Age Pension. Let's prepare your application form.", AR: "بناءً على إجاباتك، من المحتمل أنك مؤهل لمعاش الشيخوخة. دعنا نحضر نموذج الطلب.", NP: "तपाईंको उत्तरहरूको आधारमा, तपाईं वृद्धावस्था पेन्सनको लागि योग्य हुन सक्नुहुन्छ।", IT: "In base alle tue risposte, probabilmente hai diritto alla Pensione di Vecchiaia.", VI: "Dựa trên câu trả lời, bạn có thể đủ điều kiện nhận Lương hưu Tuổi già." },
  "notEligible.agePension": { EN: "You may not be eligible right now. I can help you understand the requirements or look at other options.", AR: "قد لا تكون مؤهلاً الآن. يمكنني مساعدتك في فهم المتطلبات أو النظر في خيارات أخرى.", NP: "तपाईं अहिले योग्य नहुन सक्नुहुन्छ। म तपाईंलाई आवश्यकताहरू बुझ्न वा अन्य विकल्पहरू हेर्न मद्दत गर्न सक्छु।", IT: "Potresti non essere idoneo ora. Posso aiutarti a capire i requisiti o cercare altre opzioni.", VI: "Bạn có thể chưa đủ điều kiện. Tôi có thể giúp bạn hiểu yêu cầu hoặc tìm lựa chọn khác." },

  // Eligibility chat UI
  "eligibility.greeting": { EN: "Hi! I'm Luma ✨ Let's check if you're eligible for", AR: "✨ مرحباً! أنا لوما. دعنا نتحقق من أهليتك لـ", NP: "नमस्ते! म Luma हुँ ✨ तपाईंको योग्यता जाँच गरौं", IT: "Ciao! Sono Luma ✨ Verifichiamo se hai diritto a", VI: "Xin chào! Tôi là Luma ✨ Hãy kiểm tra xem bạn có đủ điều kiện cho" },
  "eligibility.5questions": { EN: "I'll ask you 5 quick questions.", AR: "سأسألك 5 أسئلة سريعة.", NP: "म तपाईंलाई 5 छिटो प्रश्नहरू सोध्छु।", IT: "Ti farò 5 domande rapide.", VI: "Tôi sẽ hỏi bạn 5 câu hỏi nhanh." },
  "eligibility.questionOf": { EN: "Question", AR: "سؤال", NP: "प्रश्न", IT: "Domanda", VI: "Câu hỏi" },
  "eligibility.of": { EN: "of", AR: "من", NP: "को", IT: "di", VI: "trong" },
  "eligibility.gotIt": { EN: "Got it!", AR: "حسناً!", NP: "बुझें!", IT: "Capito!", VI: "Hiểu rồi!" },
  "eligibility.yesNo": { EN: "Just a simple yes or no is fine!", AR: "مجرد نعم أو لا يكفي!", NP: "साधारण हो वा होइन पुग्छ!", IT: "Un semplice sì o no va bene!", VI: "Chỉ cần có hoặc không!" },
  "eligibility.yes": { EN: "✅ Yes", AR: "✅ نعم", NP: "✅ हो", IT: "✅ Sì", VI: "✅ Có" },
  "eligibility.no": { EN: "❌ No", AR: "❌ لا", NP: "❌ होइन", IT: "❌ No", VI: "❌ Không" },
  "eligibility.typeAnswer": { EN: "Or type your answer…", AR: "أو اكتب إجابتك…", NP: "वा तपाईंको उत्तर टाइप गर्नुहोस्…", IT: "Oppure scrivi la tua risposta…", VI: "Hoặc nhập câu trả lời…" },
  "eligibility.send": { EN: "Send", AR: "إرسال", NP: "पठाउनुहोस्", IT: "Invia", VI: "Gửi" },
  "eligibility.prepareForm": { EN: "Prepare my form →", AR: "جهز نموذجي →", NP: "मेरो फारम तयार गर्नुहोस् →", IT: "Prepara il mio modulo →", VI: "Chuẩn bị biểu mẫu →" },
  "eligibility.downloadChecklist": { EN: "Download my checklist →", AR: "تحميل قائمتي →", NP: "मेरो चेकलिस्ट डाउनलोड गर्नुहोस् →", IT: "Scarica la mia checklist →", VI: "Tải danh sách kiểm tra →" },
  "eligibility.getOfficialForm": { EN: "Get my official form →", AR: "احصل على النموذج الرسمي →", NP: "मेरो आधिकारिक फारम प्राप्त गर्नुहोस् →", IT: "Ottieni il modulo ufficiale →", VI: "Lấy biểu mẫu chính thức →" },
  "eligibility.callAgedCare": { EN: "Call My Aged Care", AR: "اتصل بـ My Aged Care", NP: "My Aged Care मा कल गर्नुहोस्", IT: "Chiama My Aged Care", VI: "Gọi My Aged Care" },
  "eligibility.privacy": { EN: "🔒 Private · Not stored · Not connected to immigration", AR: "🔒 خاص · غير مخزن · غير متصل بالهجرة", NP: "🔒 निजी · भण्डारण गरिएको छैन · आप्रवासनसँग जोडिएको छैन", IT: "🔒 Privato · Non memorizzato · Non collegato all'immigrazione", VI: "🔒 Riêng tư · Không lưu trữ · Không liên quan đến nhập cư" },
  "eligibility.check": { EN: "Eligibility Check", AR: "فحص الأهلية", NP: "योग्यता जाँच", IT: "Verifica Idoneità", VI: "Kiểm tra Đủ điều kiện" },

  // How it works
  "howItWorks.badge": { EN: "⚡ How It Works", AR: "⚡ كيف يعمل", NP: "⚡ यो कसरी काम गर्छ", IT: "⚡ Come Funziona", VI: "⚡ Cách Hoạt Động" },
  "howItWorks.heading": { EN: "From first click to posted application", AR: "من أول نقرة إلى تقديم الطلب", NP: "पहिलो क्लिकबाट पोस्ट गरिएको आवेदनसम्म", IT: "Dal primo clic alla domanda inviata", VI: "Từ lần nhấp đầu tiên đến đơn đã gửi" },
  "howItWorks.sub": { EN: "No myGov. No English required. Luma does the work — you just sign and post.", AR: "لا myGov. لا تحتاج الإنجليزية. لوما تقوم بالعمل — أنت فقط وقع وأرسل.", NP: "myGov छैन। अंग्रेजी चाहिँदैन। Luma ले काम गर्छ — तपाईं बस हस्ताक्षर गर्नुहोस् र पोस्ट गर्नुहोस्।", IT: "Nessun myGov. Nessun inglese richiesto. Luma fa il lavoro — tu firmi e spedisci.", VI: "Không myGov. Không cần tiếng Anh. Luma làm việc — bạn chỉ ký và gửi." },
  "howItWorks.step1": { EN: "Choose your language", AR: "اختر لغتك", NP: "आफ्नो भाषा छान्नुहोस्", IT: "Scegli la tua lingua", VI: "Chọn ngôn ngữ" },
  "howItWorks.step1desc": { EN: "The entire site switches instantly — questions, documents, summary. Arabic reads right to left.", AR: "الموقع بالكامل يتحول فوراً — أسئلة، وثائق، ملخص. العربية تُقرأ من اليمين لليسار.", NP: "पूरा साइट तुरुन्तै बदलिन्छ — प्रश्नहरू, कागजातहरू, सारांश।", IT: "L'intero sito cambia istantaneamente — domande, documenti, riepilogo.", VI: "Toàn bộ trang web chuyển ngay — câu hỏi, tài liệu, tóm tắt." },
  "howItWorks.step2": { EN: "Answer 5 questions", AR: "أجب على 5 أسئلة", NP: "5 प्रश्नहरू जवाफ दिनुहोस्", IT: "Rispondi a 5 domande", VI: "Trả lời 5 câu hỏi" },
  "howItWorks.step2desc": { EN: "Luma checks your eligibility with plain-language questions. No jargon. 2 minutes.", AR: "لوما تتحقق من أهليتك بأسئلة بلغة بسيطة. بدون مصطلحات. دقيقتان.", NP: "Luma ले सरल भाषामा प्रश्नहरूद्वारा योग्यता जाँच गर्छ। 2 मिनेट।", IT: "Luma verifica la tua idoneità con domande semplici. Nessun gergo. 2 minuti.", VI: "Luma kiểm tra điều kiện bằng câu hỏi đơn giản. 2 phút." },
  "howItWorks.step3": { EN: "Photo your documents", AR: "صوّر مستنداتك", NP: "तपाईंको कागजातहरू फोटो खिच्नुहोस्", IT: "Fotografa i tuoi documenti", VI: "Chụp ảnh tài liệu" },
  "howItWorks.step3desc": { EN: "Take a photo of your Medicare card and ID. Luma reads them and fills your form automatically. Files deleted immediately after.", AR: "التقط صورة لبطاقة Medicare وهويتك. لوما تقرأها وتملأ النموذج تلقائياً. يتم حذف الملفات فوراً.", NP: "Medicare कार्ड र ID को फोटो खिच्नुहोस्। Luma ले पढ्छ र फारम स्वचालित रूपमा भर्छ।", IT: "Scatta una foto della tessera Medicare e del documento. Luma li legge e compila il modulo automaticamente.", VI: "Chụp ảnh thẻ Medicare và giấy tờ tùy thân. Luma đọc và điền biểu mẫu tự động." },
  "howItWorks.step4": { EN: "Sign and post", AR: "وقّع وأرسل", NP: "हस्ताक्षर गर्नुहोस् र पोस्ट गर्नुहोस्", IT: "Firma e spedisci", VI: "Ký và gửi" },
  "howItWorks.step4desc": { EN: "Print your pre-filled form. Sign it. Post it. Payments start from the date you post.", AR: "اطبع النموذج المعبأ. وقّعه. أرسله بالبريد. تبدأ المدفوعات من تاريخ الإرسال.", NP: "पूर्व-भरिएको फारम प्रिन्ट गर्नुहोस्। हस्ताक्षर गर्नुहोस्। पोस्ट गर्नुहोस्।", IT: "Stampa il modulo precompilato. Firmalo. Spediscilo. I pagamenti partono dalla data di invio.", VI: "In biểu mẫu đã điền. Ký. Gửi. Thanh toán bắt đầu từ ngày bạn gửi." },

  // Impact stats
  "stats.perYear": { EN: "Per year", AR: "في السنة", NP: "प्रति वर्ष", IT: "All'anno", VI: "Mỗi năm" },
  "stats.avgDSP": { EN: "Average DSP approval", AR: "متوسط الموافقة على DSP", NP: "औसत DSP स्वीकृति", IT: "Approvazione media DSP", VI: "Phê duyệt DSP trung bình" },
  "stats.toComplete": { EN: "To complete", AR: "لإكمال", NP: "पूरा गर्न", IT: "Da completare", VI: "Để hoàn thành" },
  "stats.eligibilityCheck": { EN: "Eligibility check", AR: "فحص الأهلية", NP: "योग्यता जाँच", IT: "Verifica idoneità", VI: "Kiểm tra điều kiện" },
  "stats.languages": { EN: "Languages", AR: "لغات", NP: "भाषाहरू", IT: "Lingue", VI: "Ngôn ngữ" },
  "stats.fullTranslation": { EN: "Full site translation", AR: "ترجمة كاملة للموقع", NP: "पूर्ण साइट अनुवाद", IT: "Traduzione completa del sito", VI: "Dịch toàn bộ trang" },
  "stats.always": { EN: "Always", AR: "دائماً", NP: "सधैं", IT: "Sempre", VI: "Luôn luôn" },
  "stats.noCost": { EN: "No cost. No catch. Ever.", AR: "بدون تكلفة. بدون فخ. أبداً.", NP: "कुनै लागत छैन। कुनै जाल छैन।", IT: "Nessun costo. Nessun trucco. Mai.", VI: "Không phí. Không bẫy. Mãi mãi." },

  // CTA
  "cta.heading": { EN: "Your family deserves the support they're owed", AR: "عائلتك تستحق الدعم المستحق لها", NP: "तपाईंको परिवारले उनीहरूको हकको सहायता पाउनुपर्छ", IT: "La tua famiglia merita il sostegno che le spetta", VI: "Gia đình bạn xứng đáng nhận được sự hỗ trợ" },
  "cta.desc": { EN: "5 minutes. Completely free. Luma speaks your language. No myGov account needed. Your information is safe — we are not connected to immigration or any enforcement agency.", AR: "5 دقائق. مجاني بالكامل. لوما تتحدث لغتك. لا تحتاج حساب myGov. معلوماتك آمنة.", NP: "5 मिनेट। पूर्ण निःशुल्क। Luma तपाईंको भाषा बोल्छ। myGov खाता चाहिँदैन। तपाईंको जानकारी सुरक्षित छ।", IT: "5 minuti. Completamente gratuito. Luma parla la tua lingua. Nessun account myGov necessario. Le tue informazioni sono al sicuro.", VI: "5 phút. Hoàn toàn miễn phí. Luma nói ngôn ngữ của bạn. Không cần tài khoản myGov. Thông tin của bạn an toàn." },
  "cta.getHelp": { EN: "🌿 Get Free Help Now →", AR: "🌿 احصل على مساعدة مجانية الآن →", NP: "🌿 अहिले निःशुल्क सहायता पाउनुहोस् →", IT: "🌿 Ottieni Aiuto Gratuito Ora →", VI: "🌿 Nhận Trợ Giúp Miễn Phí Ngay →" },
  "cta.chooseLang": { EN: "🌍 Choose Your Language First", AR: "🌍 اختر لغتك أولاً", NP: "🌍 पहिले आफ्नो भाषा छान्नुहोस्", IT: "🌍 Scegli Prima la Tua Lingua", VI: "🌍 Chọn Ngôn Ngữ Trước" },
  "cta.questions": { EN: "Questions?", AR: "أسئلة؟", NP: "प्रश्नहरू?", IT: "Domande?", VI: "Câu hỏi?" },
  "cta.emailUs": { EN: "Email us", AR: "راسلنا", NP: "हामीलाई इमेल गर्नुहोस्", IT: "Scrivici", VI: "Gửi email cho chúng tôi" },
  "cta.replyTime": { EN: "— reply within 24 hours", AR: "— الرد خلال 24 ساعة", NP: "— 24 घण्टा भित्र जवाफ", IT: "— risposta entro 24 ore", VI: "— trả lời trong 24 giờ" },

  // Payments band
  "payments.dsp": { EN: "Disability Support Pension", AR: "معاش دعم الإعاقة", NP: "अपाङ्गता सहायता पेन्सन", IT: "Pensione Disabilità", VI: "Trợ cấp Khuyết tật" },
  "payments.agePension": { EN: "Age Pension", AR: "معاش الشيخوخة", NP: "वृद्धावस्था पेन्सन", IT: "Pensione Vecchiaia", VI: "Lương hưu" },
  "payments.carer": { EN: "Carer Payment", AR: "دفع مقدم الرعاية", NP: "हेरचाहकर्ता भुक्तानी", IT: "Pagamento Assistente", VI: "Trợ cấp Chăm sóc" },
  "payments.medicare": { EN: "Medicare Enrolment", AR: "تسجيل Medicare", NP: "Medicare दर्ता", IT: "Iscrizione Medicare", VI: "Đăng ký Medicare" },
  "payments.avgValue": { EN: "Average annual value", AR: "القيمة السنوية المتوسطة", NP: "औसत वार्षिक मूल्य", IT: "Valore medio annuale", VI: "Giá trị trung bình hàng năm" },

  // Service page
  "service.back": { EN: "← Back to all services", AR: "← العودة لجميع الخدمات", NP: "← सबै सेवाहरूमा फिर्ता", IT: "← Torna a tutti i servizi", VI: "← Quay lại tất cả dịch vụ" },
  "service.checkEligibility": { EN: "Check your eligibility with Luma", AR: "تحقق من أهليتك مع لوما", NP: "Luma सँग तपाईंको योग्यता जाँच गर्नुहोस्", IT: "Verifica la tua idoneità con Luma", VI: "Kiểm tra điều kiện với Luma" },
  "service.safetyTitle": { EN: "Your information is completely safe", AR: "معلوماتك آمنة تماماً", NP: "तपाईंको जानकारी पूर्ण सुरक्षित छ", IT: "Le tue informazioni sono completamente al sicuro", VI: "Thông tin của bạn hoàn toàn an toàn" },
  "service.safetyDesc": { EN: "We never share your information with immigration, police or any government agency. Documents are deleted immediately after use.", AR: "لا نشارك معلوماتك أبداً مع الهجرة أو الشرطة أو أي جهة حكومية. يتم حذف المستندات فوراً بعد الاستخدام.", NP: "हामी तपाईंको जानकारी कहिल्यै आप्रवासन, प्रहरी वा कुनै सरकारी निकायसँग साझा गर्दैनौं।", IT: "Non condividiamo mai le tue informazioni con immigrazione, polizia o agenzie governative.", VI: "Chúng tôi không bao giờ chia sẻ thông tin với cơ quan nhập cư, cảnh sát hay chính phủ." },

  // Prepare form
  "prepare.title": { EN: "Prepare Your Form", AR: "جهّز نموذجك", NP: "तपाईंको फारम तयार गर्नुहोस्", IT: "Prepara il Tuo Modulo", VI: "Chuẩn bị Biểu mẫu" },
  "prepare.desc": { EN: "Luma will help you get your documents ready.", AR: "لوما ستساعدك في تجهيز مستنداتك.", NP: "Luma ले तपाईंको कागजातहरू तयार गर्न मद्दत गर्छ।", IT: "Luma ti aiuterà a preparare i tuoi documenti.", VI: "Luma sẽ giúp bạn chuẩn bị tài liệu." },
  "prepare.whichForm": { EN: "Which form do you need? Pick one below.", AR: "أي نموذج تحتاج؟ اختر واحداً أدناه.", NP: "तपाईंलाई कुन फारम चाहिन्छ? तल एक छान्नुहोस्।", IT: "Di quale modulo hai bisogno? Scegline uno sotto.", VI: "Bạn cần biểu mẫu nào? Chọn một bên dưới." },
  "prepare.select": { EN: "Select →", AR: "اختر →", NP: "छान्नुहोस् →", IT: "Seleziona →", VI: "Chọn →" },
  "prepare.fullName": { EN: "Full Name", AR: "الاسم الكامل", NP: "पूरा नाम", IT: "Nome Completo", VI: "Họ và Tên" },
  "prepare.enterName": { EN: "Enter your full name", AR: "أدخل اسمك الكامل", NP: "तपाईंको पूरा नाम प्रविष्ट गर्नुहोस्", IT: "Inserisci il tuo nome completo", VI: "Nhập họ và tên" },
  "prepare.medicareCard": { EN: "Medicare Card (photo or scan)", AR: "بطاقة Medicare (صورة أو مسح)", NP: "Medicare कार्ड (फोटो वा स्क्यान)", IT: "Tessera Medicare (foto o scansione)", VI: "Thẻ Medicare (ảnh hoặc scan)" },
  "prepare.idDoc": { EN: "ID Document (passport, licence, etc.)", AR: "وثيقة هوية (جواز سفر، رخصة، إلخ)", NP: "पहिचान कागजात (पासपोर्ट, लाइसेन्स, आदि)", IT: "Documento d'identità (passaporto, patente, ecc.)", VI: "Giấy tờ tùy thân (hộ chiếu, bằng lái, v.v.)" },
  "prepare.continue": { EN: "Continue →", AR: "متابعة →", NP: "जारी राख्नुहोस् →", IT: "Continua →", VI: "Tiếp tục →" },
  "prepare.gotDetails": { EN: "I've got your details. Here's what I found:", AR: "حصلت على تفاصيلك. إليك ما وجدته:", NP: "मैले तपाईंको विवरण पाएँ। यो मैले फेला पारेको हो:", IT: "Ho i tuoi dati. Ecco cosa ho trovato:", VI: "Tôi đã có thông tin của bạn. Đây là những gì tôi tìm thấy:" },
  "prepare.name": { EN: "Name", AR: "الاسم", NP: "नाम", IT: "Nome", VI: "Tên" },
  "prepare.form": { EN: "Form", AR: "النموذج", NP: "फारम", IT: "Modulo", VI: "Biểu mẫu" },
  "prepare.uploaded": { EN: "✓ Uploaded", AR: "✓ تم الرفع", NP: "✓ अपलोड गरियो", IT: "✓ Caricato", VI: "✓ Đã tải lên" },
  "prepare.notProvided": { EN: "Not provided", AR: "غير مقدم", NP: "प्रदान गरिएको छैन", IT: "Non fornito", VI: "Chưa cung cấp" },
  "prepare.date": { EN: "Date", AR: "التاريخ", NP: "मिति", IT: "Data", VI: "Ngày" },
  "prepare.dob": { EN: "Date of Birth", AR: "تاريخ الميلاد", NP: "जन्म मिति", IT: "Data di Nascita", VI: "Ngày sinh" },
  "prepare.address": { EN: "Address", AR: "العنوان", NP: "ठेगाना", IT: "Indirizzo", VI: "Địa chỉ" },
  "prepare.enterAddress": { EN: "Enter your address", AR: "أدخل عنوانك", NP: "तपाईंको ठेगाना प्रविष्ट गर्नुहोस्", IT: "Inserisci il tuo indirizzo", VI: "Nhập địa chỉ" },
  "prepare.phone": { EN: "Phone", AR: "الهاتف", NP: "फोन", IT: "Telefono", VI: "Điện thoại" },
  "prepare.enterPhone": { EN: "Enter your phone number", AR: "أدخل رقم هاتفك", NP: "तपाईंको फोन नम्बर प्रविष्ट गर्नुहोस्", IT: "Inserisci il numero di telefono", VI: "Nhập số điện thoại" },
  "prepare.downloadSummary": { EN: "Download your details summary →", AR: "تحميل ملخص بياناتك →", NP: "तपाईंको विवरण सारांश डाउनलोड गर्नुहोस् →", IT: "Scarica il riepilogo dei tuoi dati →", VI: "Tải xuống bản tóm tắt thông tin →" },
  "prepare.downloadOfficial": { EN: "Download official form →", AR: "تحميل النموذج الرسمي →", NP: "आधिकारिक फारम डाउनलोड गर्नुहोस् →", IT: "Scarica il modulo ufficiale →", VI: "Tải biểu mẫu chính thức →" },
  "prepare.agedCareCall": { EN: "For Aged Care, please call My Aged Care to start your assessment:", AR: "لرعاية المسنين، يرجى الاتصال بـ My Aged Care لبدء تقييمك:", NP: "वृद्ध हेरचाहको लागि, कृपया My Aged Care मा कल गर्नुहोस्:", IT: "Per l'assistenza anziani, chiama My Aged Care per iniziare la valutazione:", VI: "Đối với Chăm sóc Người cao tuổi, vui lòng gọi My Aged Care:" },
  "prepare.copyNumber": { EN: "Copy number", AR: "نسخ الرقم", NP: "नम्बर कपी गर्नुहोस्", IT: "Copia numero", VI: "Sao chép số" },
  "prepare.phoneCopied": { EN: "Phone number copied!", AR: "تم نسخ رقم الهاتف!", NP: "फोन नम्बर कपी भयो!", IT: "Numero copiato!", VI: "Đã sao chép số điện thoại!" },
  "prepare.download": { EN: "Download my pre-filled form →", AR: "تحميل نموذجي المعبأ →", NP: "मेरो पूर्व-भरिएको फारम डाउनलोड गर्नुहोस् →", IT: "Scarica il mio modulo precompilato →", VI: "Tải xuống biểu mẫu đã điền →" },
  "prepare.docsLocal": { EN: "🔒 Your documents are processed locally and never stored on our servers.", AR: "🔒 يتم معالجة مستنداتك محلياً ولا يتم تخزينها أبداً.", NP: "🔒 तपाईंको कागजातहरू स्थानीय रूपमा प्रशोधन गरिन्छ र कहिल्यै भण्डारण गरिँदैन।", IT: "🔒 I tuoi documenti sono elaborati localmente e mai salvati.", VI: "🔒 Tài liệu được xử lý cục bộ và không bao giờ được lưu trữ." },
  "prepare.done": { EN: "Your form has been downloaded! Print it and post it, or bring it to our office. You're all set!", AR: "تم تحميل نموذجك! اطبعه وأرسله بالبريد، أو أحضره لمكتبنا.", NP: "तपाईंको फारम डाउनलोड भयो! प्रिन्ट गर्नुहोस् र पोस्ट गर्नुहोस्, वा हाम्रो कार्यालयमा ल्याउनुहोस्।", IT: "Il tuo modulo è stato scaricato! Stampalo e spediscilo, oppure portalo al nostro ufficio.", VI: "Biểu mẫu đã được tải xuống! In và gửi, hoặc mang đến văn phòng chúng tôi." },
  "prepare.backHome": { EN: "← Back to home", AR: "← العودة للرئيسية", NP: "← गृहपृष्ठमा फिर्ता", IT: "← Torna alla home", VI: "← Quay lại trang chủ" },

  // Footer
  "footer.services": { EN: "Services", AR: "الخدمات", NP: "सेवाहरू", IT: "Servizi", VI: "Dịch vụ" },
  "footer.organisation": { EN: "Organisation", AR: "المنظمة", NP: "संगठन", IT: "Organizzazione", VI: "Tổ chức" },
  "footer.languages": { EN: "Languages", AR: "اللغات", NP: "भाषाहरू", IT: "Lingue", VI: "Ngôn ngữ" },
  "footer.aboutNccsa": { EN: "About NCCSA", AR: "عن NCCSA", NP: "NCCSA बारेमा", IT: "Chi è NCCSA", VI: "Về NCCSA" },
  "footer.volunteerPortal": { EN: "Volunteer Portal", AR: "بوابة المتطوعين", NP: "स्वयंसेवक पोर्टल", IT: "Portale Volontari", VI: "Cổng Tình nguyện" },
  "footer.contactUs": { EN: "Contact Us", AR: "اتصل بنا", NP: "सम्पर्क गर्नुहोस्", IT: "Contattaci", VI: "Liên hệ" },
  "footer.privacyPolicy": { EN: "Privacy Policy", AR: "سياسة الخصوصية", NP: "गोपनीयता नीति", IT: "Informativa Privacy", VI: "Chính sách Bảo mật" },
  "footer.governance": { EN: "Governance", AR: "الحوكمة", NP: "शासन", IT: "Governance", VI: "Quản trị" },
  "footer.desc": { EN: "Helping families in Salisbury, Elizabeth, Paralowie, Davoren and surrounding Northern Adelaide suburbs access the payments they deserve — in their language, at no cost.", AR: "مساعدة العائلات في سالزبري وإليزابيث وباراوي وديفورن والضواحي المحيطة في شمال أديلايد للحصول على المدفوعات التي يستحقونها — بلغتهم، بدون تكلفة.", NP: "सालिसबरी, एलिजाबेथ, पारलोई, डेभोरन र वरपरका उत्तरी एडिलेड उपनगरहरूमा परिवारहरूलाई उनीहरूको भाषामा, निःशुल्क सहायता।", IT: "Aiutiamo le famiglie di Salisbury, Elizabeth, Paralowie, Davoren e sobborghi di Adelaide Nord ad accedere ai pagamenti che meritano — nella loro lingua, senza costi.", VI: "Giúp đỡ các gia đình ở Salisbury, Elizabeth, Paralowie, Davoren và vùng ngoại ô Bắc Adelaide tiếp cận các khoản thanh toán — bằng ngôn ngữ của họ, miễn phí." },
  "footer.copyright": { EN: "© 2025 Northern Community Care SA Inc. All rights reserved.", AR: "© 2025 مؤسسة رعاية مجتمع شمال أديلايد. جميع الحقوق محفوظة.", NP: "© 2025 Northern Community Care SA Inc. सर्वाधिकार सुरक्षित।", IT: "© 2025 Northern Community Care SA Inc. Tutti i diritti riservati.", VI: "© 2025 Northern Community Care SA Inc. Bảo lưu mọi quyền." },

  // Volunteer page
  "volunteer.title": { EN: "Volunteer With Us", AR: "تطوع معنا", NP: "हामीसँग स्वयंसेवक बन्नुहोस्", IT: "Fai Volontariato con Noi", VI: "Tình Nguyện Với Chúng Tôi" },
  "volunteer.desc": { EN: "Join our volunteer team and help multicultural families in Northern Adelaide access the support they deserve", AR: "انضم إلى فريق المتطوعين لدينا وساعد العائلات متعددة الثقافات في شمال أديلايد للحصول على الدعم الذي يستحقونه", NP: "हाम्रो स्वयंसेवक टोलीमा सामेल हुनुहोस् र उत्तरी एडिलेडमा बहुसांस्कृतिक परिवारहरूलाई उनीहरूको हकको सहायता प्राप्त गर्न मद्दत गर्नुहोस्", IT: "Unisciti al nostro team di volontari e aiuta le famiglie multiculturali di Adelaide Nord ad accedere al supporto che meritano", VI: "Tham gia đội tình nguyện của chúng tôi và giúp đỡ các gia đình đa văn hóa ở Bắc Adelaide tiếp cận hỗ trợ" },
  "volunteer.fullName": { EN: "Full Name", AR: "الاسم الكامل", NP: "पूरा नाम", IT: "Nome Completo", VI: "Họ và Tên" },
  "volunteer.email": { EN: "Email", AR: "البريد الإلكتروني", NP: "इमेल", IT: "Email", VI: "Email" },
  "volunteer.phone": { EN: "Phone", AR: "الهاتف", NP: "फोन", IT: "Telefono", VI: "Điện thoại" },
  "volunteer.language": { EN: "Language Spoken", AR: "اللغة المتحدثة", NP: "बोलिने भाषा", IT: "Lingua Parlata", VI: "Ngôn ngữ nói" },
  "volunteer.selectLang": { EN: "Select a language", AR: "اختر لغة", NP: "भाषा छान्नुहोस्", IT: "Seleziona una lingua", VI: "Chọn ngôn ngữ" },
  "volunteer.arabic": { EN: "Arabic", AR: "العربية", NP: "अरबी", IT: "Arabo", VI: "Tiếng Ả Rập" },
  "volunteer.nepali": { EN: "Nepali", AR: "النيبالية", NP: "नेपाली", IT: "Nepalese", VI: "Tiếng Nepal" },
  "volunteer.italian": { EN: "Italian", AR: "الإيطالية", NP: "इटालियन", IT: "Italiano", VI: "Tiếng Ý" },
  "volunteer.vietnamese": { EN: "Vietnamese", AR: "الفيتنامية", NP: "भियतनामी", IT: "Vietnamita", VI: "Tiếng Việt" },
  "volunteer.other": { EN: "Other", AR: "أخرى", NP: "अन्य", IT: "Altro", VI: "Khác" },
  "volunteer.availability": { EN: "Availability", AR: "التوفر", NP: "उपलब्धता", IT: "Disponibilità", VI: "Thời gian rảnh" },
  "volunteer.weekdays": { EN: "Weekdays", AR: "أيام الأسبوع", NP: "हप्ताका दिनहरू", IT: "Giorni feriali", VI: "Ngày trong tuần" },
  "volunteer.weekends": { EN: "Weekends", AR: "عطلة نهاية الأسبوع", NP: "सप्ताहन्त", IT: "Fine settimana", VI: "Cuối tuần" },
  "volunteer.evenings": { EN: "Evenings", AR: "المساء", NP: "साँझ", IT: "Sere", VI: "Buổi tối" },
  "volunteer.submit": { EN: "Submit Application", AR: "تقديم الطلب", NP: "आवेदन पेश गर्नुहोस्", IT: "Invia Candidatura", VI: "Gửi Đơn" },
  "volunteer.thankYou": { EN: "Thank you for your application! We'll be in touch within 48 hours.", AR: "شكراً لطلبك! سنتواصل معك خلال 48 ساعة.", NP: "तपाईंको आवेदनको लागि धन्यवाद! हामी 48 घण्टा भित्र सम्पर्कमा हुनेछौं।", IT: "Grazie per la tua candidatura! Ti contatteremo entro 48 ore.", VI: "Cảm ơn đơn đăng ký của bạn! Chúng tôi sẽ liên hệ trong 48 giờ." },

  // About page
  "about.title": { EN: "About Northern Community Care SA Inc", AR: "عن مؤسسة رعاية مجتمع شمال أديلايد", NP: "Northern Community Care SA Inc बारेमा", IT: "Chi è Northern Community Care SA Inc", VI: "Về Northern Community Care SA Inc" },
  "about.mission": { EN: "Our Mission", AR: "مهمتنا", NP: "हाम्रो मिशन", IT: "La Nostra Missione", VI: "Sứ mệnh của chúng tôi" },
  "about.missionText": { EN: "We exist to ensure every multicultural family in Northern Adelaide can access the government support they are entitled to — regardless of language, literacy or digital access. Our services are always free, private and delivered with cultural respect.", AR: "نحن موجودون لضمان أن كل عائلة متعددة الثقافات في شمال أديلايد يمكنها الوصول إلى الدعم الحكومي الذي تستحقه — بغض النظر عن اللغة أو محو الأمية أو الوصول الرقمي. خدماتنا دائماً مجانية وخاصة ومقدمة باحترام ثقافي.", NP: "हामी उत्तरी एडिलेडमा हरेक बहुसांस्कृतिक परिवारले भाषा, साक्षरता वा डिजिटल पहुँचको चिन्ता नगरी सरकारी सहायता प्राप्त गर्न सक्ने सुनिश्चित गर्न अवस्थित छौं। हाम्रा सेवाहरू सधैं निःशुल्क, निजी र सांस्कृतिक सम्मानका साथ प्रदान गरिन्छ।", IT: "Esistiamo per garantire che ogni famiglia multiculturale di Adelaide Nord possa accedere al supporto governativo a cui ha diritto — indipendentemente dalla lingua, dall'alfabetizzazione o dall'accesso digitale. I nostri servizi sono sempre gratuiti, privati e forniti con rispetto culturale.", VI: "Chúng tôi tồn tại để đảm bảo mọi gia đình đa văn hóa ở Bắc Adelaide có thể tiếp cận hỗ trợ chính phủ mà họ được hưởng — bất kể ngôn ngữ, trình độ đọc viết hay khả năng truy cập kỹ thuật số. Dịch vụ của chúng tôi luôn miễn phí, riêng tư và được cung cấp với sự tôn trọng văn hóa." },
  "about.serving": { EN: "Serving Northern Adelaide", AR: "خدمة شمال أديلايد", NP: "उत्तरी एडिलेड सेवा", IT: "Al Servizio di Adelaide Nord", VI: "Phục vụ Bắc Adelaide" },
  "about.servingText": { EN: "We serve families across Salisbury, Elizabeth, Paralowie, Davoren Park and surrounding suburbs. Our team includes community workers who speak Arabic, Nepali, Italian, Vietnamese and English — so you can always be understood.", AR: "نحن نخدم العائلات في سالزبري وإليزابيث وباراوي وديفورن بارك والضواحي المحيطة. يضم فريقنا عاملين مجتمعيين يتحدثون العربية والنيبالية والإيطالية والفيتنامية والإنجليزية.", NP: "हामी सालिसबरी, एलिजाबेथ, पारलोई, डेभोरन पार्क र वरपरका उपनगरहरूमा परिवारहरूलाई सेवा दिन्छौं। हाम्रो टोलीमा अरबी, नेपाली, इटालियन, भियतनामी र अंग्रेजी बोल्ने सामुदायिक कार्यकर्ताहरू छन्।", IT: "Serviamo le famiglie di Salisbury, Elizabeth, Paralowie, Davoren Park e sobborghi circostanti. Il nostro team include operatori comunitari che parlano arabo, nepalese, italiano, vietnamita e inglese.", VI: "Chúng tôi phục vụ các gia đình ở Salisbury, Elizabeth, Paralowie, Davoren Park và vùng ngoại ô xung quanh. Đội ngũ của chúng tôi bao gồm nhân viên cộng đồng nói tiếng Ả Rập, Nepal, Ý, Việt và Anh." },
  "about.languagesTitle": { EN: "5 Languages Supported", AR: "٥ لغات مدعومة", NP: "५ भाषाहरू समर्थित", IT: "5 Lingue Supportate", VI: "Hỗ trợ 5 Ngôn ngữ" },
  "about.contact": { EN: "Contact Us", AR: "اتصل بنا", NP: "सम्पर्क गर्नुहोस्", IT: "Contattaci", VI: "Liên hệ" },
  "about.contactText": { EN: "Have questions or need help? Reach out to us — we reply within 24 hours.", AR: "لديك أسئلة أو تحتاج مساعدة؟ تواصل معنا — نرد خلال 24 ساعة.", NP: "प्रश्नहरू छन् वा मद्दत चाहिन्छ? हामीलाई सम्पर्क गर्नुहोस् — हामी 24 घण्टा भित्र जवाफ दिन्छौं।", IT: "Hai domande o hai bisogno di aiuto? Contattaci — rispondiamo entro 24 ore.", VI: "Có câu hỏi hoặc cần giúp đỡ? Liên hệ chúng tôi — trả lời trong 24 giờ." },
};
