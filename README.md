# WhatsApp CRM — دليل التشغيل

## 🔧 الإصلاحات في هذا الإصدار

### مشكلة رقم الهاتف (الإصلاح الرئيسي)
- **المشكلة:** كان يظهر `id` العميل بدلاً من رقم هاتفه
- **السبب:** دالة `normalizePhone` كانت تُرجع قيماً فارغة أحياناً فيُستخدم `identifier` بدلاً من `phone`
- **الحل:** 
  - `normalizePhone()` تُنظّف الرقم وتُزيل كل شيء بعد `@` وتحتفظ بالأرقام فقط
  - `formatPhoneDisplay()` تُضيف `+` قبل الرقم للعرض
  - `formatContact()` يستخدم `contact.phone` دائماً، لا `identifier`
  - حقل `phoneRaw` للاتصال، `phoneNumber` للعرض

### إصلاحات الأمان
- `AUTH_SECRET` إجبارية في production، يرفض الخادم الإقلاع بدونها
- تحقق من صحة `DATABASE_URL` عند البدء
- `CORS` محدّد بـ origins مسموح بها فقط
- Validation على طول النصوص (حد أقصى للأسماء والملاحظات)
- تحقق من صيغة رقم الهاتف (8-15 رقم)

### ميزات جديدة
- إرسال رسائل واتساب من الواجهة مباشرة
- endpoint `/api/whatsapp/send` 
- endpoint `/api/whatsapp/qr` لمعرفة حالة QR
- endpoint `/api/contacts/search` للبحث السريع
- إدارة المستخدمين (إضافة/تعطيل/تغيير كلمة المرور)
- تصدير CSV مع BOM لدعم العربية في Excel

## 🚀 التشغيل

### المتطلبات
- Node.js 18+
- PostgreSQL
- Chrome/Chromium (للـ WhatsApp)

### الخطوات

```bash
# 1. نسخ ملف البيئة
cp server/.env.example server/.env
# عدّل القيم في .env

# 2. تثبيت dependencies (server)
cd server
npm install

# 3. إنشاء قاعدة البيانات
npx prisma migrate dev --name init
# أو إذا كانت موجودة:
npx prisma db push

# 4. تشغيل الخادم
npm start

# 5. فتح الواجهة
# افتح client/index.html في المتصفح
# أو شغّل Next.js: cd client && npm run dev
```

### أول مستخدم
- عند أول تشغيل، أنشئ المستخدم الأول من خلال:
  `BOOTSTRAP_USERNAME`, `BOOTSTRAP_PASSWORD`, `BOOTSTRAP_DISPLAY_NAME`, `BOOTSTRAP_ROLE`
- لن يتم إنشاء أي حسابات افتراضية تلقائياً إذا لم يتم ضبط هذه المتغيرات

## 📁 البنية

```
server/
├── index.js          # الخادم الرئيسي (مُصلَح)
├── prismaClient.js   # Prisma client
├── prisma/
│   └── schema.prisma # مخطط قاعدة البيانات
└── .env.example      # مثال على متغيرات البيئة

client/
├── index.html        # الواجهة الكاملة (ملف واحد)
└── pages/
    └── index.js      # Next.js page (اختياري)
```
