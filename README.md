# ممارس

هذا مشروع منصة تعليمية وإدارية تجمع التسجيل والمتابعة والاختبارات والحضور والتقارير بمكان واحد.

المشروع مقسوم قسمين:

- `frontend/`: الواجهة، ومبنية بـ Vue 3 وVuetify 3.
- `backend/`: الـAPI والصلاحيات والداتا بيس، ومبني بـ Laravel 12.

## وش موجود بالمشروع؟

- تسجيل من الواجهة العامة.
- دخول ومستخدمين وأدوار وصلاحيات.
- إدارة الطلاب والمقرئين والمتدربين.
- اختبارات قبلية وبعدية ومهام واختبار نهائي.
- حضور ونتائج وتقارير.
- إشعارات داخل لوحة التحكم.
- صفحات تختلف على حسب دور المستخدم.

## وش التقنيات المستخدمة؟

- Backend: Laravel 12
- Frontend: Vue 3 + Vuetify 3
- Database: MySQL
- Auth: Laravel Fortify + Sanctum
- Permissions: Spatie Permission
- Build: Vite 8
- File Handling: Spatie Medialibrary
- Realtime: Pusher
- Cache / Queue: Redis

## وش تحتاج قبل تشغله؟

- Node.js 22
- PHP 8.2 أو أحدث
- Composer 2
- MySQL 8

ثبت الحزم أول مرة:

```bash
npm --prefix frontend ci
composer install --working-dir=backend
```

شغّل الواجهة:

```bash
npm run dev
```

شغّل الـbackend:

```bash
npm run serve:backend
```

ولو تبي الاثنين مع بعض محليًا:

```bash
npm run dev:all
```

ابنِ نسخة الإنتاج:

```bash
npm run build
```

## كيف تضبط الداتا بيس؟

عندك طريقتين:

- تبي نفس البيانات الحالية: استورد `backend/database/momars-data.sql`.
- تبي قاعدة نظيفة: شغّل migrations الموجودة داخل `backend/database/migrations`.

التفاصيل والأوامر كاملة موجودة في `docs/DATABASE_SETUP.md`.

بعد ما تضبط MySQL:

1. انسخ `backend/.env.example` إلى `backend/.env`.
2. حط بيانات الداتا بيس داخل `backend/.env`.
3. شغّل `php backend/artisan key:generate`.
4. لو القاعدة نظيفة شغّل `php backend/artisan migrate --force`.

## كيف تشغّل الاختبارات؟

```bash
npm test
npm --prefix frontend run test:unit
```

ولفحص الواجهة والبناء:

```bash
npm run lint
npm run build
```

## أشياء انتبه لها بالإنتاج

- خل `APP_ENV=production` و`APP_DEBUG=false`.
- غيّر كل كلمات المرور والمفاتيح، ولا تستخدم أي بيانات قديمة مثل ما هي.
- إذا عندك ملفات مرفوعة شغّل `php backend/artisan storage:link`.
- إذا بتستخدم Pusher عبّ إعدادات `PUSHER_*`.
- إذا بتستخدم Redis اضبط `CACHE_STORE=redis` وباقي إعداداته.
- سو فحص أمان وأداء أخير قبل الإطلاق الفعلي.

## وين تلقى باقي الشرح؟

- `backend/README.md`: شرح الـbackend.
- `docs/DATABASE_SETUP.md`: تركيب MySQL واستيراد البيانات.
- `docs/OPERATIONS_RUNBOOK.md`: النشر والمراقبة والرجوع لإصدار قديم.
- `docs/DATA_RETENTION_AND_PRIVACY.md`: التعامل مع البيانات والخصوصية.
- `docs/ENGINEERING_QUALITY_BASELINE.md`: أوامر فحص الجودة.
