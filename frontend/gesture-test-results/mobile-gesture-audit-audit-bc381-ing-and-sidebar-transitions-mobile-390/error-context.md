# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-gesture-audit.spec.mjs >> audit actual touch scrolling and sidebar transitions
- Location: e2e\mobile-gesture-audit.spec.mjs:5:1

# Error details

```
Error: page.evaluate: TypeError: Cannot read properties of null (reading 'scrollTop')
    at eval (eval at evaluate (:311:30), <anonymous>:15:17)
    at UtilityScript.evaluate (<anonymous>:313:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
```

# Page snapshot

```yaml
- main [ref=f7e5]:
  - generic [ref=f7e6]:
    - complementary [ref=f7e8]:
      - link "شعار البرنامج لوحة التحكم" [ref=f7e9] [cursor=pointer]:
        - /url: /momars/practitioner
        - img "شعار البرنامج" [ref=f7e10]
        - generic [ref=f7e11]: لوحة التحكم
      - navigation [ref=f7e12]:
        - button "الرئيسية" [disabled] [ref=f7e14]
        - button "الدورات" [disabled] [ref=f7e23]
        - button "المهام الأدائية" [disabled] [ref=f7e32]
        - button "الاختبار النهائي" [disabled] [ref=f7e41]
        - button "استبيان الرضا" [disabled] [ref=f7e50]
        - button "المستخدمين" [disabled] [ref=f7e59]
        - button "الإشعارات" [disabled] [ref=f7e68]
        - button "المواد التدريبية" [disabled] [ref=f7e77]
        - button "النتائج" [disabled] [ref=f7e86]
        - button "متطلبات الاجتياز" [disabled] [ref=f7e95]
        - button "الاعدادات" [disabled] [ref=f7e105]
    - main [ref=f7e115]:
      - button "فتح القائمة" [ref=f7e118] [cursor=pointer]
```