const DEFAULT_HOME_PAGE_CONTENT = {
  brandTitle: 'منصة الرخص المهنية',
  licensesMenuTitle: 'اختر الرخصة المهنية',
  heroTitle: 'منصة الرخص المهنية',
  heroText: 'بيئة موحدة لإدارة الرخص المهنية، متابعة التقييمات، ورفع جاهزية المعلمين والمعلمات عبر برامج تأهيلية واضحة ومسارات مرنة وتجربة رقمية حديثة.',
  heroPrimaryButtonLabel: 'الرخص المهنية',
  heroSecondaryButtonLabel: 'إنجازاتنا',
  programsSectionTitle: 'الرخص المهنية',
  programAvailableActionLabel: 'الدخول',
  programUpcomingActionLabel: 'سيتم الإطلاق قريباً',
  faqEyebrow: 'الأسئلة الشائعة',
  faqTitle: 'إجابات سريعة لأكثر الأسئلة تداولاً',
  faqText: 'توضيحات مختصرة حول مفهوم الرخصة المهنية، شروطها، وآلية التقدم عليها للمعلمين والمعلمات.',
  footerBrandTitle: 'منصة الرخص المهنية',
  footerDescription: 'برنامج تأهيلي يُعنى بإعداد معلمي ومعلمات القرآن عبر أربع مجالات رئيسة (الشرعي، التعليمي، التربوي، المهاري)، بهدف تأهيلهم لقيادة الحلقة القرآنية بكفاءة وفاعلية.',
  footerAboutTitle: 'عن المنصة',
  footerHomeLabel: 'الرئيسية',
  footerLicensesLabel: 'الرخص المتاحة',
  footerContactTitle: 'تواصل معنا',
  footerAddress: 'القصيم، المملكة العربية السعودية',
  footerPhone: '+966 50 000 0000',
  footerPoliciesTitle: 'الأنظمة والسياسات',
  footerPrivacyLabel: 'سياسة الخصوصية',
  footerTermsLabel: 'الشروط والأحكام',
  footerCopyright: 'جمعية تحفيظ القرآن الكريم. جميع الحقوق محفوظة.',
  footerDevelopedBy: 'تم التطوير بواسطة',
  achievements: {
    maleTraineesTitle: 'أعداد المعلمين',
    femaleTraineesTitle: 'أعداد المعلمات',
    satisfactionRateTitle: 'نسبة الرضا',
    licenseCountTitle: 'رخص متعدد',
  },
  programs: [
    {
      title: 'رخصة ممارس',
      menuSubtitle: '',
      description: 'المسار الأساسي لإعداد الممارسين عبر المحتوى التأهيلي والاختبارات وإدارة التقدم.',
      audience: 'الفئة المستهدفة: المعلمون والمعلمات',
      features: ['مسار تأهيلي متكامل', 'اختبارات قبلية وبعدية', 'متابعة نتائج وتقارير'],
    },
    {
      title: 'رخصة مدير',
      menuSubtitle: '',
      description: 'مسار متخصص للقيادة الإدارية، الإشراف على البرامج، وقياس الجاهزية التشغيلية.',
      audience: 'الفئة المستهدفة: مدراء البرامج والقيادات التنفيذية',
      features: ['لوحات مؤشرات تنفيذية', 'إشراف على الدورات', 'متابعة حالة الفروع'],
    },
    {
      title: 'رخصة مشرف',
      menuSubtitle: '',
      description: 'مسار إشرافي لمتابعة الأداء الميداني وجودة التنفيذ والتواصل مع الفرق التدريبية.',
      audience: 'الفئة المستهدفة: المشرفون والمشرفات',
      features: ['متابعة ميدانية', 'مؤشرات أداء فرعية', 'تنسيق مباشر مع المقيمين'],
    },
    {
      title: 'رخصة سكرتير',
      menuSubtitle: '',
      description: 'مسار تشغيلي يركز على التنظيم الإداري وإدارة المهام اليومية والملفات والمتابعة.',
      audience: 'الفئة المستهدفة: فرق السكرتارية والإسناد الإداري',
      features: ['تنظيم المهام', 'إدارة السجلات', 'متابعة الجداول والتنبيهات'],
    },
  ],
  faqItems: [
    {
      question: 'ما هي الرخصة المهنية؟',
      answer: 'الرخصة المهنية وثيقة تنظيمية تمنح شاغلي الوظائف التعليمية بعد استيفاء المتطلبات والمعايير المعتمدة، وتؤكد الجاهزية المهنية والمعرفية لممارسة التعليم بكفاءة.',
    },
    {
      question: 'ما شروط الحصول على الرخصة المهنية؟',
      answer: 'تشمل الشروط عادةً استيفاء المؤهل المطلوب، والتسجيل في الاختبارات المهنية المعتمدة، وتحقيق الدرجة المطلوبة، والالتزام بالضوابط والإجراءات التي تعلنها الجهة المختصة.',
    },
    {
      question: 'كيف أتقدم للحصول على رخصة مهنية كمعلم؟',
      answer: 'تتقدم عبر التسجيل في المنصة أو الجهة المعتمدة، ثم حجز الاختبار المهني المناسب، واستكمال البيانات المطلوبة، وأداء الاختبار، وبعد ظهور النتيجة واستيفاء الشروط يتم إصدار الرخصة أو استكمال ما يلزم لإتمامها.',
    },
  ],
};

const normalizeText = (value, fallback) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  return repairArabicMojibake(value.trim())
    .replaceAll('متدربي ومتدربات', 'معلمي ومعلمات')
    .replaceAll('المتدربون والمتدربات', 'المعلمون والمعلمات')
    .replaceAll('المتدربين والمتدربات', 'المعلمين والمعلمات')
    .replaceAll('المتدربين', 'المعلمين')
    .replaceAll('المتدربات', 'المعلمات')
    .replaceAll('متدربين', 'معلمين')
    .replaceAll('متدربات', 'معلمات')
    .replaceAll('المتدرب', 'المعلم')
    .replaceAll('المتدربة', 'المعلمة')
    .replaceAll('متدرب', 'معلم')
    .replaceAll('متدربة', 'معلمة');
};

export const normalizeHomePageContent = (content = {}) => {
  const source = content && typeof content === 'object' ? content : {};
  const achievements = source.achievements && typeof source.achievements === 'object'
    ? source.achievements
    : {};
  const programs = Array.isArray(source.programs) ? source.programs : [];
  const faqItems = Array.isArray(source.faqItems) ? source.faqItems : [];

  return {
    brandTitle: normalizeText(source.brandTitle, DEFAULT_HOME_PAGE_CONTENT.brandTitle),
    licensesMenuTitle: normalizeText(source.licensesMenuTitle, DEFAULT_HOME_PAGE_CONTENT.licensesMenuTitle),
    heroTitle: normalizeText(source.heroTitle, DEFAULT_HOME_PAGE_CONTENT.heroTitle),
    heroText: normalizeText(source.heroText, DEFAULT_HOME_PAGE_CONTENT.heroText),
    heroPrimaryButtonLabel: normalizeText(source.heroPrimaryButtonLabel, DEFAULT_HOME_PAGE_CONTENT.heroPrimaryButtonLabel),
    heroSecondaryButtonLabel: normalizeText(source.heroSecondaryButtonLabel, DEFAULT_HOME_PAGE_CONTENT.heroSecondaryButtonLabel),
    programsSectionTitle: normalizeText(source.programsSectionTitle, DEFAULT_HOME_PAGE_CONTENT.programsSectionTitle),
    programAvailableActionLabel: normalizeText(source.programAvailableActionLabel, DEFAULT_HOME_PAGE_CONTENT.programAvailableActionLabel),
    programUpcomingActionLabel: normalizeText(source.programUpcomingActionLabel, DEFAULT_HOME_PAGE_CONTENT.programUpcomingActionLabel),
    faqEyebrow: normalizeText(source.faqEyebrow, DEFAULT_HOME_PAGE_CONTENT.faqEyebrow),
    faqTitle: normalizeText(source.faqTitle, DEFAULT_HOME_PAGE_CONTENT.faqTitle),
    faqText: normalizeText(source.faqText, DEFAULT_HOME_PAGE_CONTENT.faqText),
    footerBrandTitle: normalizeText(source.footerBrandTitle, DEFAULT_HOME_PAGE_CONTENT.footerBrandTitle),
    footerDescription: normalizeText(source.footerDescription, DEFAULT_HOME_PAGE_CONTENT.footerDescription),
    footerAboutTitle: normalizeText(source.footerAboutTitle, DEFAULT_HOME_PAGE_CONTENT.footerAboutTitle),
    footerHomeLabel: normalizeText(source.footerHomeLabel, DEFAULT_HOME_PAGE_CONTENT.footerHomeLabel),
    footerLicensesLabel: normalizeText(source.footerLicensesLabel, DEFAULT_HOME_PAGE_CONTENT.footerLicensesLabel),
    footerContactTitle: normalizeText(source.footerContactTitle, DEFAULT_HOME_PAGE_CONTENT.footerContactTitle),
    footerAddress: normalizeText(source.footerAddress, DEFAULT_HOME_PAGE_CONTENT.footerAddress),
    footerPhone: normalizeText(source.footerPhone, DEFAULT_HOME_PAGE_CONTENT.footerPhone),
    footerPoliciesTitle: normalizeText(source.footerPoliciesTitle, DEFAULT_HOME_PAGE_CONTENT.footerPoliciesTitle),
    footerPrivacyLabel: normalizeText(source.footerPrivacyLabel, DEFAULT_HOME_PAGE_CONTENT.footerPrivacyLabel),
    footerTermsLabel: normalizeText(source.footerTermsLabel, DEFAULT_HOME_PAGE_CONTENT.footerTermsLabel),
    footerCopyright: normalizeText(source.footerCopyright, DEFAULT_HOME_PAGE_CONTENT.footerCopyright),
    footerDevelopedBy: normalizeText(source.footerDevelopedBy, DEFAULT_HOME_PAGE_CONTENT.footerDevelopedBy),
    achievements: {
      maleTraineesTitle: normalizeText(achievements.maleTraineesTitle, DEFAULT_HOME_PAGE_CONTENT.achievements.maleTraineesTitle),
      femaleTraineesTitle: normalizeText(achievements.femaleTraineesTitle, DEFAULT_HOME_PAGE_CONTENT.achievements.femaleTraineesTitle),
      satisfactionRateTitle: normalizeText(achievements.satisfactionRateTitle, DEFAULT_HOME_PAGE_CONTENT.achievements.satisfactionRateTitle),
      licenseCountTitle: normalizeText(achievements.licenseCountTitle, DEFAULT_HOME_PAGE_CONTENT.achievements.licenseCountTitle),
    },
    programs: DEFAULT_HOME_PAGE_CONTENT.programs.map((program, index) => {
      const incomingProgram = programs[index] && typeof programs[index] === 'object' ? programs[index] : {};
      const incomingFeatures = Array.isArray(incomingProgram.features) ? incomingProgram.features : [];

      return {
        title: normalizeText(incomingProgram.title, program.title),
        menuSubtitle: normalizeText(incomingProgram.menuSubtitle, program.menuSubtitle),
        description: normalizeText(incomingProgram.description, program.description),
        audience: normalizeText(incomingProgram.audience, program.audience),
        features: program.features.map((feature, featureIndex) => normalizeText(incomingFeatures[featureIndex], feature)),
      };
    }),
    faqItems: DEFAULT_HOME_PAGE_CONTENT.faqItems.map((item, index) => {
      const incomingItem = faqItems[index] && typeof faqItems[index] === 'object' ? faqItems[index] : {};

      return {
        question: normalizeText(incomingItem.question, item.question),
        answer: normalizeText(incomingItem.answer, item.answer),
      };
    }),
  };
};

export const cloneHomePageContent = (content = null) => JSON.parse(JSON.stringify(normalizeHomePageContent(content || DEFAULT_HOME_PAGE_CONTENT)));

export default DEFAULT_HOME_PAGE_CONTENT;
import { repairArabicMojibake } from './textEncoding';
