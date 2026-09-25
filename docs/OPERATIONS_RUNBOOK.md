# كيف تنشر الموقع وتراقبه؟

## المراقبة والتنبيهات

Workflow اسمه `Monitor production` يشتغل كل خمس دقايق. حط هذي القيم داخل GitHub Secrets:

- `PRODUCTION_MONITOR_URL`
- `OPERATIONS_ALERT_WEBHOOK_URL`

الفحص يتأكد إن الموقع والـAPI والداتا بيس والـcache والـqueue شغالين، ويراقب الأخطاء والتأخير. لو فيه مشكلة يرسل webhook ويفشّل الـworkflow.

تقدر تتحكم بالحدود من هذي المتغيرات:

- `HEALTH_MAX_ERRORS_5M`
- `HEALTH_MAX_PENDING_JOBS`
- `HEALTH_MAX_FAILED_JOBS`

## النشر

سو بيئتين محميّة في GitHub باسم `staging` و`production`، وحط فيها:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_ROOT`
- `DEPLOY_URL`
- `DEPLOY_SSH_KEY`
- `DEPLOY_KNOWN_HOSTS`

شغّل `Deploy release` وحدد commit SHA أو tag ثابت. الـworkflow يفحص النسخة، يرفعها، يشغّل migrations، وبعدها يحوّل symlink اسمه `current` للنسخة الجديدة.

خلك مخلي ملف البيئة بالسيرفر هنا:

`<DEPLOY_ROOT>/shared/.env`

لو التفعيل فشل، السكربت يرجع تلقائي للنسخة اللي قبلها. النظام يحتفظ بآخر خمس نسخ.

## لو تبي ترجع نسخة قديمة

شغّل `Roll back release`، اختر البيئة، وحط SHA واحد من النسخ المحفوظة. الرجوع يبدّل الكود وبعدها يشغّل فحص staging.

الـrollback ما يرجّع migrations للخلف، عشان كذا أي migration بالإنتاج لازم يظل متوافق مع النسخة اللي قبله على الأقل.

بعد النشر أو الرجوع تأكد من هذي الروابط والأشياء:

- `/up`
- `/api/health/operations`
- الـAPI العام
- الدخول والصلاحيات
- CORS

وتقدر تشغّل الفحص كذا:

```bash
npm run verify:staging
```
