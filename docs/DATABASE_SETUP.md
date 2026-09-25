# كيف تركّب MySQL وتدخل بيانات المشروع؟

داخل المشروع فيه ملف جاهز اسمه:

`backend/database/momars-data.sql`

هذا الملف مأخوذ من قاعدة `momars` الحالية، وتمت تجربة استيراده ورجعت كل الـ40 جدول بدون مشكلة.

ما تحتاج أي مجلد MySQL خام من `AppData`. الملف اللي تحتاجه فعلًا هو `momars-data.sql`، لأنه يتركب على MySQL عندك بدون ما يكون مربوط بجهاز معيّن.

## أول شيء: أنشئ القاعدة والمستخدم

ادخل MySQL بحساب إداري وشغّل هذا، ولا تنسى تغيّر كلمة المرور:

```sql
CREATE DATABASE momars
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE USER 'momars_user'@'localhost'
    IDENTIFIED BY 'CHANGE_THIS_STRONG_PASSWORD';

GRANT ALL PRIVILEGES ON momars.*
    TO 'momars_user'@'localhost';

FLUSH PRIVILEGES;
```

## لو تبي نفس البيانات الحالية

من جذر المشروع شغّل:

```bash
mysql --default-character-set=utf8mb4 -u momars_user -p momars < backend/database/momars-data.sql
```

بعدها حط نفس بيانات الاتصال داخل `backend/.env`.

ملف SQL فيه بيانات التطبيق الحالية، ومنها حسابات بكلمات مرور مشفرة. بعد الاستيراد غيّر كلمات المرور والمفاتيح قبل ما تفتح الموقع للناس.

## لو تبي قاعدة فاضية ونظيفة

ثبت الحزم وجهّز `.env`:

```bash
composer install --working-dir=backend --no-dev --optimize-autoloader
cp backend/.env.example backend/.env
php backend/artisan key:generate
php backend/artisan migrate --force
```

قبل migrations تأكد إنك عدلت هذي القيم داخل `backend/.env`:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=momars
DB_USERNAME=momars_user
DB_PASSWORD=CHANGE_THIS_STRONG_PASSWORD
```

## كيف تسوي أول حساب مدير بقاعدة نظيفة؟

حط هذي القيم مؤقتًا ببيئة التشغيل:

```dotenv
MOMARS_SEED_ADMIN_LOGIN=admin
MOMARS_SEED_ADMIN_PASSWORD=CHANGE_THIS_STRONG_PASSWORD
MOMARS_SEED_ADMIN_NAME=System Admin
MOMARS_SEED_ADMIN_EMAIL=admin@example.com
```

وبعدين شغّل:

```bash
php backend/artisan db:seed --force
```

بعد ما ينضاف الحساب احذف كلمة المرور المؤقتة من ملف البيئة.

## طيب والملفات المرفوعة؟

المرفقات ما تكون داخل MySQL. لو استلمت مرفقات إضافية مع المشروع، حط الملفات بمكانها داخل هالمجلدين:

- `backend/storage/app/public`
- `backend/storage/app/private`

وبعد النقل شغّل:

```bash
php backend/artisan storage:link
```
