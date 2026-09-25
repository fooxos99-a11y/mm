# مكونات الواجهة الجاهزة

بدل ما تستورد كل مكوّن من ملف لحاله، خذهم من المكان الموحّد:

```js
import {
  AppButton,
  AppInput,
  AppTextField,
  AppSelect,
  AppDialog,
  AppCard,
  AppTable,
  AppPagination,
  AppEmptyState,
  AppErrorState,
  AppLoadingSpinner,
  AppSkeleton,
} from '@/components/ui';
```

إذا احتجت زر أو حقل أو نافذة أو تحميل، استخدم مكونات `App*` الموجودة قبل ما تسوي مكوّن جديد، عشان الشكل والسلوك يظلون موحّدين بكل الصفحات.

`AppTextField` هو الغلاف الموحّد لحقول Vuetify داخل لوحة التحكم، ويمرر الخصائص والأحداث والـslots بدون ما يغيّرها.
