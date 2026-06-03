import { useState } from "react";
import { Link } from "react-router";
import { Phone, PhoneCall, PhoneMissed, Star, Calendar, Eye, UserCheck } from "lucide-react";

interface Unit {
  id: string;
  name: string;
  totalNumbers: number;
  newNumbers: number;
  returnNumbers: number;
  contacted: number;
  answered: number;
  featured: number;
  notFeatured: number;
  viewings: number;
  bookings: number;
  isActive: boolean;
}

export function Dashboard() {
  const [units] = useState<Unit[]>([
    {
      id: "1",
      name: "وحدة أحمد محمد",
      totalNumbers: 45,
      newNumbers: 12,
      returnNumbers: 33,
      contacted: 28,
      answered: 18,
      featured: 8,
      notFeatured: 10,
      viewings: 5,
      bookings: 2,
      isActive: true,
    },
    {
      id: "2",
      name: "وحدة سارة علي",
      totalNumbers: 38,
      newNumbers: 15,
      returnNumbers: 23,
      contacted: 22,
      answered: 14,
      featured: 6,
      notFeatured: 8,
      viewings: 4,
      bookings: 3,
      isActive: true,
    },
    {
      id: "3",
      name: "وحدة محمود حسن",
      totalNumbers: 52,
      newNumbers: 8,
      returnNumbers: 44,
      contacted: 35,
      answered: 22,
      featured: 12,
      notFeatured: 10,
      viewings: 7,
      bookings: 4,
      isActive: true,
    },
    {
      id: "4",
      name: "وحدة نور الدين",
      totalNumbers: 30,
      newNumbers: 10,
      returnNumbers: 20,
      contacted: 18,
      answered: 11,
      featured: 5,
      notFeatured: 6,
      viewings: 3,
      bookings: 1,
      isActive: false,
    },
  ]);

  const totalStats = units.reduce(
    (acc, unit) => ({
      totalNumbers: acc.totalNumbers + unit.totalNumbers,
      newNumbers: acc.newNumbers + unit.newNumbers,
      returnNumbers: acc.returnNumbers + unit.returnNumbers,
      contacted: acc.contacted + unit.contacted,
      answered: acc.answered + unit.answered,
      featured: acc.featured + unit.featured,
      notFeatured: acc.notFeatured + unit.notFeatured,
      viewings: acc.viewings + unit.viewings,
      bookings: acc.bookings + unit.bookings,
    }),
    {
      totalNumbers: 0,
      newNumbers: 0,
      returnNumbers: 0,
      contacted: 0,
      answered: 0,
      featured: 0,
      notFeatured: 0,
      viewings: 0,
      bookings: 0,
    }
  );

  const activeUnits = units.filter((u) => u.isActive).length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-zinc-900 mb-2">لوحة التحكم الرئيسية</h2>
        <p className="text-zinc-600">نظرة عامة على جميع الوحدات والإحصائيات اليومية</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-zinc-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-zinc-600">إجمالي الأرقام اليوم</h3>
          </div>
          <p className="text-4xl font-bold text-zinc-900">{totalStats.totalNumbers}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-zinc-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <PhoneCall className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-sm font-medium text-zinc-600">أرقام جديدة</h3>
          </div>
          <p className="text-4xl font-bold text-zinc-900">{totalStats.newNumbers}</p>
          <p className="text-sm text-zinc-500 mt-1">أول مرة تكلمنا</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-zinc-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <PhoneMissed className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-sm font-medium text-zinc-600">أرقام سابقة</h3>
          </div>
          <p className="text-4xl font-bold text-zinc-900">{totalStats.returnNumbers}</p>
          <p className="text-sm text-zinc-500 mt-1">كلمتنا قبل كدا</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-zinc-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <UserCheck className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-sm font-medium text-zinc-600">وحدات نشطة</h3>
          </div>
          <p className="text-4xl font-bold text-zinc-900">{activeUnits}</p>
          <p className="text-sm text-zinc-500 mt-1">من {units.length} وحدة</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl border border-zinc-200">
        <h3 className="text-xl font-bold text-zinc-900 mb-6">ملخص اليوم</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
          <div>
            <p className="text-sm text-zinc-600 mb-2">تم الاتصال</p>
            <p className="text-2xl font-bold text-zinc-900">{totalStats.contacted}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-600 mb-2">رد على المكالمة</p>
            <p className="text-2xl font-bold text-green-600">{totalStats.answered}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-600 mb-2">رقم مميز</p>
            <p className="text-2xl font-bold text-blue-600">{totalStats.featured}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-600 mb-2">رقم غير مميز</p>
            <p className="text-2xl font-bold text-zinc-600">{totalStats.notFeatured}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-600 mb-2">معاينة</p>
            <p className="text-2xl font-bold text-purple-600">{totalStats.viewings}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-600 mb-2">حجز</p>
            <p className="text-2xl font-bold text-orange-600">{totalStats.bookings}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-600 mb-2">لم يرد</p>
            <p className="text-2xl font-bold text-red-600">{totalStats.contacted - totalStats.answered}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="p-6 border-b border-zinc-200">
          <h3 className="text-xl font-bold text-zinc-900">جميع الوحدات</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-semibold text-zinc-900">اسم الوحدة</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-zinc-900">الحالة</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-zinc-900">الأرقام اليوم</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-zinc-900">جديدة</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-zinc-900">سابقة</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-zinc-900">تم الاتصال</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-zinc-900">رد</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-zinc-900">معاينة/حجز</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-zinc-900">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {units.map((unit) => (
                <tr key={unit.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-zinc-900">{unit.name}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        unit.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {unit.isActive ? "نشط" : "غير نشط"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-semibold text-zinc-900">
                    {unit.totalNumbers}
                  </td>
                  <td className="px-6 py-4 text-center text-green-600 font-semibold">
                    {unit.newNumbers}
                  </td>
                  <td className="px-6 py-4 text-center text-purple-600 font-semibold">
                    {unit.returnNumbers}
                  </td>
                  <td className="px-6 py-4 text-center text-blue-600 font-semibold">
                    {unit.contacted}
                  </td>
                  <td className="px-6 py-4 text-center text-green-600 font-semibold">
                    {unit.answered}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-purple-600 font-semibold">{unit.viewings}</span>
                    <span className="text-zinc-400 mx-1">/</span>
                    <span className="text-orange-600 font-semibold">{unit.bookings}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link
                      to={`/unit/${unit.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      عرض التفاصيل
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
