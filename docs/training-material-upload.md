# رفع المواد التدريبية

- الحد لكل ملف: 100 MiB (104857600 بايت)، في الواجهة والتحقق الخلفي ومكتبة تخزين المرفقات.
- مهلة طلب الحفظ في الواجهة: 10 دقائق بدل مهلة الطلب العامة البالغة 12 ثانية.
- يميّز الخادم أخطاء PHP بحسب رمز فشل الاستقبال، ولا يعرض مسارات التخزين أو تفاصيل الاستثناءات.
- رسائل 413 تتعلق بمجموع الطلب، ولا تعني بالضرورة أن ملفًا واحدًا تجاوز 100 MiB.

## إعداد الخادم عند النشر

ملف `backend/public/.user.ini` يضبط PHP-FPM/CGI على `upload_max_filesize=100M` و`post_max_size=1024M` لاستقبال عدة مرفقات. تحقّق من تفعيل `user_ini.filename` وعدم وجود `php_admin_value` أقل في إعدادات FPM. قد تستغرق قراءة الملف الجديد خمس دقائق حسب `user_ini.cache_ttl`.

داخل كتلة Nginx الخاصة بالموقع، اضبط:

```nginx
client_max_body_size 1024M;
client_body_timeout 600s;
fastcgi_read_timeout 600s;
```

تحقّق من الإعدادات باستخدام `nginx -t` قبل إعادة تحميل Nginx، وأعد تحميل PHP-FPM بعد ضبطه، وأعد بناء إعدادات Laravel المخزنة مؤقتًا ضمن مسار النشر المعتمد. تحقّق أيضًا من أي حد أصغر في الوكيل الأمامي، ومساحة القرص وصلاحية مجلد التخزين المؤقت.

يلزم التحقق بطلب HTTP حقيقي من رفع ملف أكبر من 20 MiB وملف عند 100 MiB ورفض ملف أكبر، بالإضافة إلى رفع عدة ملفات. اختبارات Laravel لا تثبت حدود PHP-FPM أو Nginx، ولا سرعة رفع 100 MiB عبر الشبكة.

أكد فحص ترويسات طلب بحجم 100 MiB على الموقع أن Nginx يعيد 413 قبل وصول الطلب للتطبيق. إجراء GitHub المخصص `Configure training uploads` يطبّق الإعدادات أعلاه بعد نجاح Verify وSonarCloud لنفس النسخة، باستخدام اتصال النشر المحفوظ في بيئة production. يحفظ نسخة احتياطية من ملف الموقع، ويتحقق من اسم الموقع ومسار النشر، ويختبر إعداد Nginx قبل إعادة تحميله، ويستعيد الإعداد السابق إذا فشل الاختبار أو إعادة التحميل. يحتاج اتصال SSH بصلاحية root أو sudo غير تفاعلي لتشغيل Python وإعادة تحميل Nginx.

## الملفات المتغيرة

التحقق المحلي: نجح 15 اختبارًا خلفيًا ضمن نطاق المرفقات والحسابات وعزل الصلاحيات، واختباران لمنطق الواجهة، واختبارا متصفح بمقاسي 390 و1440 بكسل. نجح بناء الإنتاج وفحص حجم الكود وفحص الأسرار. فحص ESLint بلا أخطاء، مع تحذير قائم في `AttachmentContent.vue` خارج التعديل. اختبارات المتصفح تستخدم استجابة 422 محاكية للتحقق من عرض السبب؛ واختبارات Laravel تتحقق من أسباب PHP والتحقق والصلاحيات فعليًا داخل بيئة الاختبار.

| الملف | نوع التغيير |
| --- | --- |
| `backend/app/Http/Requests/CoreData/Concerns/HasTrainingMaterialRules.php` | تعديل الحد ورسائل التحقق وأسباب فشل PHP |
| `backend/bootstrap/app.php` | إضافة استجابة عربية لتجاوز حجم الطلب |
| `backend/config/media-library.php` | إضافة ضبط حد مكتبة المرفقات |
| `backend/public/.user.ini` | إضافة إعدادات استقبال PHP |
| `frontend/src/features/controllers/AdminTrainingMaterialsView.js` | تعديل فحص الحجم وعرض الأخطاء |
| `frontend/src/features/training-materials/trainingMaterialUpload.mjs` | إضافة منطق الحجم وتصنيف الأخطاء |
| `frontend/src/services/trainingMaterialsApi.js` | زيادة مهلة رفع الملفات |
| `frontend/src/views/AdminTrainingMaterialsView.vue` | إظهار الحد المسموح |
| `backend/tests/Feature/TrainingMaterialUploadTest.php` | إضافة اختبارات الحجم والفشل والصلاحيات |
| `frontend/node-tests/training-material-upload.test.mjs` | إضافة اختبارات التحقق ورسائل الأخطاء |
| `frontend/e2e/training-material-upload.spec.mjs` | إضافة فحص رسالة الخطأ في الجوال والكمبيوتر |
| `docs/training-material-upload.md` | توثيق التغيير ومتطلبات الخادم |
| `scripts/server/configure-training-uploads.py` | إضافة ضبط Nginx مع نسخة رجوع والتحقق قبل إعادة التحميل |
| `scripts/server/test_configure_training_uploads.py` | اختبار تحويل إعداد الموقع ومنع تعديل مواقع أخرى |
| `.github/workflows/configure-training-uploads.yml` | إضافة إجراء ضبط الخادم المحمي ببوابات الإصدار |
