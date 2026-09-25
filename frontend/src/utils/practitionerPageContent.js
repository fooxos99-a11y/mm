const DEFAULT_PRACTITIONER_PAGE_CONTENT = {
  brandTitle: 'برنامج رخصة ممارس',
  heroTitle: 'برنامج رخصة ممارس',
  heroText: 'برنامج تأهيلي يُعنى بإعداد معلمي ومعلمات القرآن عبر أربع مجالات رئيسة (الشرعي، التعليمي، التربوي، المهاري)، بهدف تأهيلهم لقيادة الحلقة القرآنية بكفاءة وفاعلية.',
  heroPrimaryButtonLabel: 'سجل الآن',
  heroSecondaryButtonLabel: 'تعرّف على البرنامج',
  navItems: [
    { label: 'عن البرنامج' },
    { label: 'مجالات وكفايات البرنامج' },
    { label: 'المتطلبات' },
  ],
  aboutEyebrow: 'لمحة عن البرنامج',
  aboutTitlePrefix: 'برنامج',
  aboutTitleHighlight: 'رخصة ممارس',
  aboutLead: 'برنامج تأهيلي يُعنى بإعداد معلمي ومعلمات القرآن عبر أربع مجالات رئيسة (الشرعي، التعليمي، التربوي، المهاري)، بهدف تأهيلهم لقيادة الحلقة القرآنية بكفاءة وفاعلية.',
  aboutBody: 'يتضمن البرنامج لقاءات تدريبية حضورية ومهام أدائية إضافة إلى عرض القرآن، بما يعزز كفاءة المعلم والمعلمة في تعليم القرآن.',
  goalsHeadingPrefix: 'أهداف',
  goalsHeadingHighlight: 'البرنامج',
  goals: [
    'التعرّف على أهمية العلم الشرعي وأهم مسائل العقيدة والطهارة والصلاة',
    'إتقان أساسيات تعليم القرآن الكريم ومبادئ علم التجويد',
    'توظيف الأساليب التربوية المناسبة في التعامل مع الطلاب',
    'استحضار أهمية الرسالة التعليمية والالتزام بها',
    'تطبيق مهارات التواصل والتخطيط في البيئة التعليمية',
    'إدارة الحلقة القرآنية وتنظيمها بكفاءة',
  ],
  statsEyebrow: 'نظرة سريعة',
  statsTitlePrefix: 'مؤشرات',
  statsTitleHighlight: 'البرنامج',
  indicatorLabels: {
    memorization: 'مجموع الأجزاء المقروءة',
    attendance: 'الحضور',
    assessments: 'اختبار قبلي وبعدي',
    courses: 'دورة',
    tasks: 'المهام الأدائية',
    completed30: 'عدد خريجي هذه الدفعة معلم ومعلمة',
  },
  competenciesTitle: 'مجالات وكفايات البرنامج',
  domains: [
    {
      title: 'كفايات المجال الشرعي',
      items: [
        'أهمية العلم الشرعي وأثره في حياة المعلم/ة',
        'أهم مسائل التوحيد والإيمان',
        'أهم مسائل الطهارة',
        'الأحكام العامة للصلاة',
      ],
    },
    {
      title: 'كفايات المجال التعليمي',
      items: [
        'مبادئ أحكام التجويد نظريًا وتطبيقيًا',
        'استراتيجيات تعليم القرآن الكريم',
        'مباحث وآداب قرآنية',
      ],
    },
    {
      title: 'كفايات المجال التربوي',
      items: [
        'مدخل في التربية وأهميتها وخصائصها',
        'خصائص المراحل العمرية واحتياجاتها',
        'الأساليب التربوية',
        'بناء القيم وتعزيز السلوك',
        'الصحة النفسية في البيئة التعليمية',
      ],
    },
    {
      title: 'كفايات المجال المهاري',
      items: [
        'مهارات التواصل الفعال',
        'إدارة الحلقة القرآنية',
        'تكامل شخصية المعلم',
        'مهارات التخطيط',
        'التعامل مع النظام التقني (ناظم)',
        'الدور الاستراتيجي للمعلم والمعلمة',
      ],
    },
  ],
  includesTitle: 'ماذا يتضمن البرنامج؟',
  includesItems: [
    { num: '01', title: 'لقاءات تدريبية حضورية' },
    { num: '02', title: 'مهام أدائية تطبيقية' },
    { num: '03', title: 'عرض القرآن' },
    { num: '04', title: 'اختبارات قبلية وبعدية' },
    { num: '05', title: 'اختبار نهائي' },
  ],
  requirementsTitle: 'متطلبات الحصول على الرخصة',
  requirements: [
    'حضور ما لا يقل عن (10) لقاءات من اللقاءات التدريبية',
    'تنفيذ (80%) من المهام الأدائية',
    'اجتياز الاختبار النهائي بنسبة لا تقل عن (70%)',
    'الالتزام بآداب وأخلاقيات تعليم القرآن الكريم',
  ],
  recitationTitle: 'إتمام عرض القرآن وفق الآتي:',
  recitation: [
    { tag: 'الرجال', text: 'المعلمون: عرض كامل القرآن' },
    { tag: 'النساء', text: 'المعلمات: عرض (10) أجزاء' },
  ],
  recitationMechanismTitle: 'آلية عرض القرآن وختمة التلاوة',
  recitationMechanismItems: [
    'أن يكون العرض على مقرئ معتمد من معهد الإمام عاصم أو من إدارة الشؤون التعليمية.',
    'يكون مقدار العرض: المعلمون: (27) جزءًا قراءةً مرسلةً واضحةً خاليةً من اللحون الجلية ثم (3) أجزاءٍ بالتجويد.',
    'يكون مقدار العرض: المعلمات: (9) أجزاء قراءةً مرسلةً واضحةً خاليةً من اللحون الجلية ثم جزء واحد بالتجويد.',
    'يُسمح بخمسة تنبيهات لكل جزء.',
    'عند التنبيه السادس يوقف المشارك ويستمع إلى المصحف المعلم لضبط الموضع ثم يعيد قراءة الجزء، ويكرر ذلك حتى يتم الإتقان.',
    'تُطبق في الأجزاء المقروءة بالتجويد أحكام التجويد الأساسية: أحكام النون الساكنة والتنوين، الميم الساكنة، النون والميم المشددتين، المدود.',
  ],
  durationTitle: 'مدة البرنامج وآلية التنفيذ',
  durationQuickInfo: [
    { label: 'المدة', value: 'ستة أسابيع' },
    { label: 'التكرار', value: 'دورتان أسبوعيًا' },
    { label: 'آلية التنفيذ', value: 'حضوريًا' },
  ],
  durationDescriptionPrimary: 'مدة البرنامج ستة أسابيع، بواقع دورتين تدريبيتين أسبوعيًا، يتخللها تنفيذ مهام أدائية واختبارات قبلية وبعدية، إضافة إلى عرض القرآن واختبار نهائي.',
  durationDescriptionSecondary: 'يُنفّذ البرنامج حضوريًا، وفق الجدول التدريبي المعتمد لكل من المعلمين والمعلمات.',
  startDatesTitle: 'بداية البرنامج',
  startDates: [
    { tag: 'الرجال', text: 'يوم الإثنين 18 / 10 / 1447هـ' },
    { tag: 'النساء', text: 'يوم السبت 23 / 10 / 1447هـ' },
  ],
  footerBrandTitle: 'برنامج رخصة ممارس',
  footerDescription: 'برنامج تأهيلي يُعنى بإعداد معلمي ومعلمات القرآن عبر أربع مجالات رئيسة (الشرعي، التعليمي، التربوي، المهاري)، بهدف تأهيلهم لقيادة الحلقة القرآنية بكفاءة وفاعلية.',
  footerQuickLinksTitle: 'روابط سريعة',
  footerContactTitle: 'تواصل معنا',
  footerAddress: 'القصيم، المملكة العربية السعودية',
  footerPhone: '+966 50 000 0000',
  footerPoliciesTitle: 'الأنظمة والسياسات',
  footerPrivacyLabel: 'سياسة الخصوصية',
  footerTermsLabel: 'الشروط والأحكام',
  footerCopyright: 'برنامج رخصة ممارس. جميع الحقوق محفوظة.',
  footerDevelopedBy: 'تم التطوير بواسطة',
  loginDialogTitle: 'تسجيل الدخول',
  loginCodeLabel: 'رقم الدخول',
  loginPasswordLabel: 'كلمة المرور',
  loginSubmitLabel: 'دخول',
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

const resolveList = (source, key, fallback) => (Array.isArray(source[key]) ? source[key] : fallback);

export const normalizePractitionerPageContent = (content = {}) => {
  const source = content && typeof content === 'object' ? content : {};
  const navItems = resolveList(source, 'navItems', DEFAULT_PRACTITIONER_PAGE_CONTENT.navItems);
  const indicatorLabels = source.indicatorLabels && typeof source.indicatorLabels === 'object' ? source.indicatorLabels : {};
  const goals = resolveList(source, 'goals', DEFAULT_PRACTITIONER_PAGE_CONTENT.goals);
  const domains = resolveList(source, 'domains', DEFAULT_PRACTITIONER_PAGE_CONTENT.domains);
  const includesItems = resolveList(source, 'includesItems', DEFAULT_PRACTITIONER_PAGE_CONTENT.includesItems);
  const requirements = resolveList(source, 'requirements', DEFAULT_PRACTITIONER_PAGE_CONTENT.requirements);
  const recitation = resolveList(source, 'recitation', DEFAULT_PRACTITIONER_PAGE_CONTENT.recitation);
  const recitationMechanismItems = resolveList(source, 'recitationMechanismItems', DEFAULT_PRACTITIONER_PAGE_CONTENT.recitationMechanismItems);
  const durationQuickInfo = resolveList(source, 'durationQuickInfo', DEFAULT_PRACTITIONER_PAGE_CONTENT.durationQuickInfo);
  const startDates = resolveList(source, 'startDates', DEFAULT_PRACTITIONER_PAGE_CONTENT.startDates);

  return {
    brandTitle: normalizeText(source.brandTitle, DEFAULT_PRACTITIONER_PAGE_CONTENT.brandTitle),
    heroTitle: normalizeText(source.heroTitle, DEFAULT_PRACTITIONER_PAGE_CONTENT.heroTitle),
    heroText: normalizeText(source.heroText, DEFAULT_PRACTITIONER_PAGE_CONTENT.heroText),
    heroPrimaryButtonLabel: normalizeText(source.heroPrimaryButtonLabel, DEFAULT_PRACTITIONER_PAGE_CONTENT.heroPrimaryButtonLabel),
    heroSecondaryButtonLabel: normalizeText(source.heroSecondaryButtonLabel, DEFAULT_PRACTITIONER_PAGE_CONTENT.heroSecondaryButtonLabel),
    navItems: navItems.map((item, index) => {
      const fallback = DEFAULT_PRACTITIONER_PAGE_CONTENT.navItems[index] || { label: '' };
      const incoming = item && typeof item === 'object' ? item : {};

      return {
        label: normalizeText(incoming.label, fallback.label),
      };
    }),
    aboutEyebrow: normalizeText(source.aboutEyebrow, DEFAULT_PRACTITIONER_PAGE_CONTENT.aboutEyebrow),
    aboutTitlePrefix: normalizeText(source.aboutTitlePrefix, DEFAULT_PRACTITIONER_PAGE_CONTENT.aboutTitlePrefix),
    aboutTitleHighlight: normalizeText(source.aboutTitleHighlight, DEFAULT_PRACTITIONER_PAGE_CONTENT.aboutTitleHighlight),
    aboutLead: normalizeText(source.aboutLead, DEFAULT_PRACTITIONER_PAGE_CONTENT.aboutLead),
    aboutBody: normalizeText(source.aboutBody, DEFAULT_PRACTITIONER_PAGE_CONTENT.aboutBody),
    goalsHeadingPrefix: normalizeText(source.goalsHeadingPrefix, DEFAULT_PRACTITIONER_PAGE_CONTENT.goalsHeadingPrefix),
    goalsHeadingHighlight: normalizeText(source.goalsHeadingHighlight, DEFAULT_PRACTITIONER_PAGE_CONTENT.goalsHeadingHighlight),
    goals: goals.map((item, index) => normalizeText(item, DEFAULT_PRACTITIONER_PAGE_CONTENT.goals[index] || '')),
    statsEyebrow: normalizeText(source.statsEyebrow, DEFAULT_PRACTITIONER_PAGE_CONTENT.statsEyebrow),
    statsTitlePrefix: normalizeText(source.statsTitlePrefix, DEFAULT_PRACTITIONER_PAGE_CONTENT.statsTitlePrefix),
    statsTitleHighlight: normalizeText(source.statsTitleHighlight, DEFAULT_PRACTITIONER_PAGE_CONTENT.statsTitleHighlight),
    indicatorLabels: Object.keys(DEFAULT_PRACTITIONER_PAGE_CONTENT.indicatorLabels).reduce((result, key) => {
      result[key] = normalizeText(indicatorLabels[key], DEFAULT_PRACTITIONER_PAGE_CONTENT.indicatorLabels[key]);
      return result;
    }, {}),
    competenciesTitle: normalizeText(source.competenciesTitle, DEFAULT_PRACTITIONER_PAGE_CONTENT.competenciesTitle),
    domains: domains.map((domain, index) => {
      const fallback = DEFAULT_PRACTITIONER_PAGE_CONTENT.domains[index] || { title: '', items: [] };
      const incoming = domain && typeof domain === 'object' ? domain : {};
      const incomingItems = Array.isArray(incoming.items) ? incoming.items : fallback.items;

      return {
        title: normalizeText(incoming.title, fallback.title),
        items: incomingItems.map((item, itemIndex) => normalizeText(item, fallback.items[itemIndex] || '')),
      };
    }),
    includesTitle: normalizeText(source.includesTitle, DEFAULT_PRACTITIONER_PAGE_CONTENT.includesTitle),
    includesItems: includesItems.map((item, index) => {
      const fallback = DEFAULT_PRACTITIONER_PAGE_CONTENT.includesItems[index] || { num: String(index + 1).padStart(2, '0'), title: '' };
      const incoming = item && typeof item === 'object' ? item : {};

      return {
        num: normalizeText(incoming.num, fallback.num),
        title: normalizeText(incoming.title, fallback.title),
      };
    }),
    requirementsTitle: normalizeText(source.requirementsTitle, DEFAULT_PRACTITIONER_PAGE_CONTENT.requirementsTitle),
    requirements: requirements.map((item, index) => normalizeText(item, DEFAULT_PRACTITIONER_PAGE_CONTENT.requirements[index] || '')),
    recitationTitle: normalizeText(source.recitationTitle, DEFAULT_PRACTITIONER_PAGE_CONTENT.recitationTitle),
    recitation: recitation.map((item, index) => {
      const fallback = DEFAULT_PRACTITIONER_PAGE_CONTENT.recitation[index] || { tag: '', text: '' };
      const incoming = item && typeof item === 'object' ? item : {};

      return {
        tag: normalizeText(incoming.tag, fallback.tag),
        text: normalizeText(incoming.text, fallback.text),
      };
    }),
    recitationMechanismTitle: normalizeText(source.recitationMechanismTitle, DEFAULT_PRACTITIONER_PAGE_CONTENT.recitationMechanismTitle),
    recitationMechanismItems: recitationMechanismItems.map((item, index) => normalizeText(item, DEFAULT_PRACTITIONER_PAGE_CONTENT.recitationMechanismItems[index] || '')),
    durationTitle: normalizeText(source.durationTitle, DEFAULT_PRACTITIONER_PAGE_CONTENT.durationTitle),
    durationQuickInfo: durationQuickInfo.map((item, index) => {
      const fallback = DEFAULT_PRACTITIONER_PAGE_CONTENT.durationQuickInfo[index] || { label: '', value: '' };
      const incoming = item && typeof item === 'object' ? item : {};

      return {
        label: normalizeText(incoming.label, fallback.label),
        value: normalizeText(incoming.value, fallback.value),
      };
    }),
    durationDescriptionPrimary: normalizeText(source.durationDescriptionPrimary, DEFAULT_PRACTITIONER_PAGE_CONTENT.durationDescriptionPrimary),
    durationDescriptionSecondary: normalizeText(source.durationDescriptionSecondary, DEFAULT_PRACTITIONER_PAGE_CONTENT.durationDescriptionSecondary),
    startDatesTitle: normalizeText(source.startDatesTitle, DEFAULT_PRACTITIONER_PAGE_CONTENT.startDatesTitle),
    startDates: startDates.map((item, index) => {
      const fallback = DEFAULT_PRACTITIONER_PAGE_CONTENT.startDates[index] || { tag: '', text: '' };
      const incoming = item && typeof item === 'object' ? item : {};

      return {
        tag: normalizeText(incoming.tag, fallback.tag),
        text: normalizeText(incoming.text, fallback.text),
      };
    }),
    footerBrandTitle: normalizeText(source.footerBrandTitle, DEFAULT_PRACTITIONER_PAGE_CONTENT.footerBrandTitle),
    footerDescription: normalizeText(source.footerDescription, DEFAULT_PRACTITIONER_PAGE_CONTENT.footerDescription),
    footerQuickLinksTitle: normalizeText(source.footerQuickLinksTitle, DEFAULT_PRACTITIONER_PAGE_CONTENT.footerQuickLinksTitle),
    footerContactTitle: normalizeText(source.footerContactTitle, DEFAULT_PRACTITIONER_PAGE_CONTENT.footerContactTitle),
    footerAddress: normalizeText(source.footerAddress, DEFAULT_PRACTITIONER_PAGE_CONTENT.footerAddress),
    footerPhone: normalizeText(source.footerPhone, DEFAULT_PRACTITIONER_PAGE_CONTENT.footerPhone),
    footerPoliciesTitle: normalizeText(source.footerPoliciesTitle, DEFAULT_PRACTITIONER_PAGE_CONTENT.footerPoliciesTitle),
    footerPrivacyLabel: normalizeText(source.footerPrivacyLabel, DEFAULT_PRACTITIONER_PAGE_CONTENT.footerPrivacyLabel),
    footerTermsLabel: normalizeText(source.footerTermsLabel, DEFAULT_PRACTITIONER_PAGE_CONTENT.footerTermsLabel),
    footerCopyright: normalizeText(source.footerCopyright, DEFAULT_PRACTITIONER_PAGE_CONTENT.footerCopyright),
    footerDevelopedBy: normalizeText(source.footerDevelopedBy, DEFAULT_PRACTITIONER_PAGE_CONTENT.footerDevelopedBy),
    loginDialogTitle: normalizeText(source.loginDialogTitle, DEFAULT_PRACTITIONER_PAGE_CONTENT.loginDialogTitle),
    loginCodeLabel: normalizeText(source.loginCodeLabel, DEFAULT_PRACTITIONER_PAGE_CONTENT.loginCodeLabel),
    loginPasswordLabel: normalizeText(source.loginPasswordLabel, DEFAULT_PRACTITIONER_PAGE_CONTENT.loginPasswordLabel),
    loginSubmitLabel: normalizeText(source.loginSubmitLabel, DEFAULT_PRACTITIONER_PAGE_CONTENT.loginSubmitLabel),
  };
};

export const clonePractitionerPageContent = (content = null) => JSON.parse(JSON.stringify(normalizePractitionerPageContent(content || DEFAULT_PRACTITIONER_PAGE_CONTENT)));

export default DEFAULT_PRACTITIONER_PAGE_CONTENT;
import { repairArabicMojibake } from './textEncoding';
