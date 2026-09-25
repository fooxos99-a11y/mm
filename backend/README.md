# Backend ممارس

هذا هو الجزء الخلفي من المشروع، ومبني بـLaravel 12. هو اللي ماسك الـAPI والدخول والصلاحيات والداتا بيس والإشعارات ورفع الملفات.

## وش يدير؟

- المستخدمين والأدوار والصلاحيات.
- الطلاب والمقرئين والمتدربين.
- الاختبارات والمهام والاختبار النهائي.
- الحضور والنتائج.
- الإشعارات.
- الملفات والمرفقات.

## كيف تشغله؟

من داخل مجلد `backend`:

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan serve
```

لو القاعدة جديدة شغّل:

```bash
php artisan migrate --force
```

ولو تبي تربط مجلد الملفات العامة:

```bash
php artisan storage:link
```

وشغّل الاختبارات كذا:

```bash
php artisan test
```

## وش تضبط داخل `.env`؟

- بيانات MySQL.
- `APP_KEY`، وهذا يطلع لك من `php artisan key:generate`.
- إعدادات `SANCTUM` و`SESSION` على حسب رابط الموقع.
- إعدادات `PUSHER` لو بتستخدم التحديث اللحظي.
- إعدادات `REDIS` لو بتستخدم cache أو queue.

## من وين يجي هيكل الداتا بيس؟

كل الجداول والتعديلات موجودة داخل `database/migrations`. وعندك نسخة من البيانات الحالية داخل `database/momars-data.sql`. شرح الاستيراد موجود في `../docs/DATABASE_SETUP.md`.

## قبل ترفعه للإنتاج

1. خل `APP_ENV=production`.
2. خل `APP_DEBUG=false`.
3. تأكد إن بيانات MySQL صحيحة.
4. غيّر كلمات المرور والمفاتيح القديمة.
5. شغّل migrations لو فيه تحديثات جديدة.
6. شغّل `storage:link` لو الموقع يستخدم ملفات عامة.
7. راجع تحديثات الحزم والثغرات قبل الإطلاق.
