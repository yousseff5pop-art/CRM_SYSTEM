import { useState } from "react";
import { useParams } from "react-router";
import { Phone, CheckCircle2, XCircle, Star, Eye, Calendar, ThumbsUp, ThumbsDown, MessageSquare, ArrowRightLeft } from "lucide-react";
import { UpcomingAppointments } from "./UpcomingAppointments";

interface Message {
  id: string;
  text: string;
  timestamp: string;
  sentBy: string;
}

interface ContactNumber {
  id: string;
  number: string;
  name: string;
  isNew: boolean;
  contacted: boolean;
  answered: boolean;
  interested: boolean | null;
  featured: boolean | null;
  actionType: "none" | "viewing" | "booking";
  notes: string;
  callTime: string;
  contactDate: string;
  nextAppointment: string;
  assignedUnit: string;
  assignedEmployee: string;
  messages: Message[];
}

const unitsData: Record<string, { name: string; numbers: ContactNumber[] }> = {
  "1": {
    name: "وحدة أحمد محمد",
    numbers: [
      {
        id: "1",
        number: "01012345678",
        name: "محمد علي",
        isNew: true,
        contacted: true,
        answered: true,
        interested: true,
        featured: true,
        actionType: "viewing",
        notes: "مهتم بشقة 3 غرف",
        callTime: "10:30 ص",
        contactDate: "2026-04-14",
        nextAppointment: "2026-04-15T14:00",
        assignedUnit: "1",
        assignedEmployee: "nada",
        messages: [
          { id: "m1", text: "مرحباً، نحن نعرض شقق فاخرة في منطقتك", timestamp: "10:30 ص", sentBy: "أحمد محمد" },
          { id: "m2", text: "هل أنت مهتم بمعاينة الوحدات المتاحة؟", timestamp: "10:32 ص", sentBy: "أحمد محمد" },
        ],
      },
      {
        id: "2",
        number: "01098765432",
        name: "أحمد سعيد",
        isNew: false,
        contacted: true,
        answered: false,
        interested: null,
        featured: null,
        actionType: "none",
        notes: "",
        callTime: "11:15 ص",
        contactDate: "2026-04-14",
        nextAppointment: "2026-04-16T10:00",
        assignedUnit: "1",
        assignedEmployee: "youssef",
        messages: [
          { id: "m3", text: "لدينا عروض خاصة على الشقق", timestamp: "11:15 ص", sentBy: "أحمد محمد" },
        ],
      },
      {
        id: "3",
        number: "01155667788",
        name: "سارة محمود",
        isNew: true,
        contacted: true,
        answered: true,
        interested: false,
        featured: false,
        actionType: "none",
        notes: "السعر عالي",
        callTime: "12:00 م",
        contactDate: "2026-04-14",
        nextAppointment: "",
        assignedUnit: "1",
        assignedEmployee: "salma",
        messages: [
          { id: "m4", text: "مرحباً، نحن نقدم شقق بأسعار تنافسية", timestamp: "12:00 م", sentBy: "أحمد محمد" },
          { id: "m5", text: "لدينا خطط سداد مرنة", timestamp: "12:05 م", sentBy: "أحمد محمد" },
        ],
      },
      {
        id: "4",
        number: "01123456789",
        name: "خالد حسن",
        isNew: true,
        contacted: true,
        answered: true,
        interested: true,
        featured: true,
        actionType: "booking",
        notes: "حجز شقة في الدور الثالث",
        callTime: "01:45 م",
        contactDate: "2026-04-14",
        nextAppointment: "2026-04-17T15:00",
        assignedUnit: "1",
        assignedEmployee: "nada",
        messages: [
          { id: "m6", text: "شقق فاخرة للبيع في موقع متميز", timestamp: "01:45 م", sentBy: "أحمد محمد" },
          { id: "m7", text: "يمكنك حجز معاد للمعاينة", timestamp: "01:47 م", sentBy: "أحمد محمد" },
          { id: "m8", text: "تم تأكيد الحجز", timestamp: "02:00 م", sentBy: "أحمد محمد" },
        ],
      },
      {
        id: "5",
        number: "01087654321",
        name: "نور الدين",
        isNew: false,
        contacted: false,
        answered: false,
        interested: null,
        featured: null,
        actionType: "none",
        notes: "",
        callTime: "",
        contactDate: "",
        nextAppointment: "",
        assignedUnit: "1",
        assignedEmployee: "ahmed",
        messages: [],
      },
    ],
  },
  "2": {
    name: "وحدة سارة علي",
    numbers: [
      {
        id: "6",
        number: "01234567890",
        name: "ياسمين أحمد",
        isNew: true,
        contacted: true,
        answered: true,
        interested: true,
        featured: true,
        actionType: "viewing",
        notes: "تبحث عن شقة في التجمع",
        callTime: "09:30 ص",
        contactDate: "2026-04-14",
        nextAppointment: "2026-04-15T16:00",
        assignedUnit: "2",
        assignedEmployee: "salma",
        messages: [
          { id: "m9", text: "شقق في التجمع الخامس", timestamp: "09:30 ص", sentBy: "سارة علي" },
          { id: "m10", text: "معاينة متاحة طوال الأسبوع", timestamp: "09:32 ص", sentBy: "سارة علي" },
        ],
      },
      {
        id: "7",
        number: "01198765432",
        name: "عمر فتحي",
        isNew: false,
        contacted: true,
        answered: true,
        interested: false,
        featured: false,
        actionType: "none",
        notes: "الموقع بعيد",
        callTime: "10:45 ص",
        contactDate: "2026-04-14",
        nextAppointment: "",
        assignedUnit: "2",
        assignedEmployee: "youssef",
        messages: [
          { id: "m11", text: "عروض في مواقع مختلفة", timestamp: "10:45 ص", sentBy: "سارة علي" },
        ],
      },
      {
        id: "8",
        number: "01156789012",
        name: "منى سالم",
        isNew: true,
        contacted: true,
        answered: false,
        interested: null,
        featured: null,
        actionType: "none",
        notes: "",
        callTime: "11:30 ص",
        contactDate: "2026-04-14",
        nextAppointment: "2026-04-17T11:00",
        assignedUnit: "2",
        assignedEmployee: "sara",
        messages: [
          { id: "m12", text: "لدينا شقق مميزة للبيع", timestamp: "11:30 ص", sentBy: "سارة علي" },
        ],
      },
    ],
  },
  "3": {
    name: "وحدة محمود حسن",
    numbers: [
      {
        id: "9",
        number: "01011112222",
        name: "كريم محمد",
        isNew: false,
        contacted: true,
        answered: true,
        interested: true,
        featured: true,
        actionType: "booking",
        notes: "دفع عربون",
        callTime: "09:00 ص",
        contactDate: "2026-04-14",
        nextAppointment: "2026-04-20T11:00",
        assignedUnit: "3",
        assignedEmployee: "ahmed",
        messages: [
          { id: "m13", text: "شقق جاهزة للتسليم", timestamp: "09:00 ص", sentBy: "محمود حسن" },
          { id: "m14", text: "تم استلام العربون", timestamp: "09:30 ص", sentBy: "محمود حسن" },
        ],
      },
      {
        id: "10",
        number: "01099998888",
        name: "ريم عادل",
        isNew: true,
        contacted: true,
        answered: true,
        interested: true,
        featured: false,
        actionType: "viewing",
        notes: "معاينة يوم الخميس",
        callTime: "10:15 ص",
        contactDate: "2026-04-14",
        nextAppointment: "2026-04-17T13:00",
        assignedUnit: "3",
        assignedEmployee: "nada",
        messages: [
          { id: "m15", text: "مرحباً، لدينا وحدات متاحة للمعاينة", timestamp: "10:15 ص", sentBy: "محمود حسن" },
        ],
      },
    ],
  },
  "4": {
    name: "وحدة نور الدين",
    numbers: [
      {
        id: "11",
        number: "01077776666",
        name: "هاني سمير",
        isNew: true,
        contacted: true,
        answered: true,
        interested: true,
        featured: true,
        actionType: "viewing",
        notes: "يريد رؤية الوحدات الأربعاء",
        callTime: "09:45 ص",
        contactDate: "2026-04-14",
        nextAppointment: "2026-04-16T15:00",
        assignedUnit: "4",
        assignedEmployee: "youssef",
        messages: [
          { id: "m16", text: "عروض حصرية لفترة محدودة", timestamp: "09:45 ص", sentBy: "نور الدين" },
          { id: "m17", text: "موعد المعاينة يوم الأربعاء الساعة 3 مساءً", timestamp: "09:50 ص", sentBy: "نور الدين" },
        ],
      },
    ],
  },
};

const availableUnits = [
  { id: "1", name: "وحدة أحمد محمد" },
  { id: "2", name: "وحدة سارة علي" },
  { id: "3", name: "وحدة محمود حسن" },
  { id: "4", name: "وحدة نور الدين" },
];

const availableEmployees = [
  { id: "nada", name: "ندى" },
  { id: "youssef", name: "يوسف" },
  { id: "salma", name: "سلمى" },
  { id: "ahmed", name: "أحمد" },
  { id: "sara", name: "سارة" },
];

export function UnitDetails() {
  const { unitId } = useParams<{ unitId: string }>();
  const unitData = unitId ? unitsData[unitId] : null;

  const [numbers, setNumbers] = useState<ContactNumber[]>(unitData?.numbers || []);
  const [selectedMessages, setSelectedMessages] = useState<{ contact: ContactNumber; isOpen: boolean } | null>(null);
  const [newMessage, setNewMessage] = useState("");

  if (!unitData) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-zinc-600">الوحدة غير موجودة</p>
      </div>
    );
  }

  const updateNumber = (id: string, updates: Partial<ContactNumber>) => {
    setNumbers((prev) =>
      prev.map((num) => {
        if (num.id !== id) return num;

        const updatedNum = { ...num, ...updates };

        // إذا تم تفعيل "تم التواصل" وليس هناك تاريخ، أضف التاريخ الحالي تلقائياً
        if (updates.contacted === true && !num.contactDate) {
          const today = new Date().toISOString().split('T')[0];
          updatedNum.contactDate = today;
        }

        // إذا تم إلغاء "تم التواصل"، امسح التاريخ
        if (updates.contacted === false) {
          updatedNum.contactDate = "";
          updatedNum.answered = false;
        }

        return updatedNum;
      })
    );
  };

  const sendMessage = (contactId: string) => {
    if (!newMessage.trim()) return;

    const timestamp = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const newMsg: Message = {
      id: `m${Date.now()}`,
      text: newMessage,
      timestamp,
      sentBy: unitData?.name || "المستخدم",
    };

    setNumbers((prev) =>
      prev.map((num) =>
        num.id === contactId
          ? { ...num, messages: [...num.messages, newMsg] }
          : num
      )
    );

    setNewMessage("");
  };

  const openMessagesDialog = (contact: ContactNumber) => {
    setSelectedMessages({ contact, isOpen: true });
  };

  const closeMessagesDialog = () => {
    setSelectedMessages(null);
    setNewMessage("");
  };

  const stats = {
    total: numbers.length,
    contacted: numbers.filter((n) => n.contacted).length,
    answered: numbers.filter((n) => n.answered).length,
    newNumbers: numbers.filter((n) => n.isNew).length,
    interested: numbers.filter((n) => n.interested === true).length,
    notInterested: numbers.filter((n) => n.interested === false).length,
    featured: numbers.filter((n) => n.featured === true).length,
    viewings: numbers.filter((n) => n.actionType === "viewing").length,
    bookings: numbers.filter((n) => n.actionType === "booking").length,
    upcomingAppointments: numbers.filter((n) => n.nextAppointment !== "").length,
  };

  const upcomingAppointments = numbers
    .filter((n) => n.nextAppointment !== "")
    .map((n) => ({
      contactName: n.name,
      contactNumber: n.number,
      appointmentTime: n.nextAppointment,
      actionType: n.actionType,
      notes: n.notes,
    }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-zinc-900 mb-2">{unitData.name}</h2>
        <p className="text-zinc-600">إدارة الأرقام والمتابعة اليومية</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <p className="text-sm text-zinc-600 mb-1">إجمالي الأرقام</p>
          <p className="text-3xl font-bold text-zinc-900">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <p className="text-sm text-zinc-600 mb-1">تم الاتصال</p>
          <p className="text-3xl font-bold text-blue-600">{stats.contacted}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <p className="text-sm text-zinc-600 mb-1">رد على المكالمة</p>
          <p className="text-3xl font-bold text-green-600">{stats.answered}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <p className="text-sm text-zinc-600 mb-1">مهتم</p>
          <p className="text-3xl font-bold text-purple-600">{stats.interested}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <p className="text-sm text-zinc-600 mb-1">معاينة/حجز</p>
          <p className="text-3xl font-bold text-orange-600">
            {stats.viewings + stats.bookings}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-zinc-600" />
            <p className="text-sm text-zinc-600">مواعيد قادمة</p>
          </div>
          <p className="text-3xl font-bold text-rose-600">{stats.upcomingAppointments}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="p-6 border-b border-zinc-200">
          <h3 className="text-xl font-bold text-zinc-900">قائمة الأرقام</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-semibold text-zinc-900">الاسم</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-zinc-900">الرقم</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-900">الموظف المسؤول</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-900">نوع الرقم</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-900">تاريخ التواصل</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-900">معاد المعاينة/الاتصال</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-900">تحويل لوحدة</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-900">تم التواصل</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-900">رد</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-900">مهتم</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-900">رقم مميز</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-900">الإجراء</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-900">الرسائل</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-zinc-900">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {numbers.map((contact) => (
                <tr key={contact.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-zinc-900">{contact.name}</p>
                    {contact.callTime && (
                      <p className="text-sm text-zinc-500">{contact.callTime}</p>
                    )}
                  </td>
                  <td className="px-4 py-4 font-mono text-zinc-700">{contact.number}</td>
                  <td className="px-4 py-4 text-center">
                    <select
                      value={contact.assignedEmployee}
                      onChange={(e) =>
                        updateNumber(contact.id, { assignedEmployee: e.target.value })
                      }
                      className="px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-indigo-50"
                    >
                      {availableEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        contact.isNew
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {contact.isNew ? "جديد" : "سابق"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <input
                      type="date"
                      value={contact.contactDate}
                      onChange={(e) =>
                        updateNumber(contact.id, { contactDate: e.target.value })
                      }
                      className={`px-3 py-2 border rounded-lg text-sm focus:ring-2 ${
                        contact.contactDate
                          ? "border-blue-400 bg-blue-50 focus:ring-blue-500 focus:border-blue-500"
                          : "border-zinc-300 focus:ring-blue-500 focus:border-blue-500"
                      }`}
                    />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center gap-2">
                      <input
                        type="datetime-local"
                        value={contact.nextAppointment}
                        onChange={(e) =>
                          updateNumber(contact.id, { nextAppointment: e.target.value })
                        }
                        className={`px-3 py-2 border rounded-lg text-sm focus:ring-2 ${
                          contact.nextAppointment
                            ? "border-purple-400 bg-purple-50 focus:ring-purple-500 focus:border-purple-500"
                            : "border-zinc-300 focus:ring-purple-500 focus:border-purple-500"
                        }`}
                      />
                      {contact.nextAppointment && (
                        <Calendar className="w-5 h-5 text-purple-600 flex-shrink-0" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <select
                      value={contact.assignedUnit}
                      onChange={(e) =>
                        updateNumber(contact.id, { assignedUnit: e.target.value })
                      }
                      className="px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {availableUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={contact.contacted}
                      onChange={(e) =>
                        updateNumber(contact.id, { contacted: e.target.checked })
                      }
                      className="w-5 h-5 rounded border-zinc-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={contact.answered}
                      onChange={(e) =>
                        updateNumber(contact.id, { answered: e.target.checked })
                      }
                      className="w-5 h-5 rounded border-zinc-300 text-green-600 focus:ring-2 focus:ring-green-500"
                      disabled={!contact.contacted}
                    />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() =>
                          updateNumber(contact.id, {
                            interested: contact.interested === true ? null : true,
                          })
                        }
                        className={`p-1 rounded transition-colors ${
                          contact.interested === true
                            ? "bg-green-600 text-white"
                            : "bg-zinc-100 text-zinc-400 hover:bg-green-100 hover:text-green-600"
                        }`}
                        disabled={!contact.answered}
                        title="مهتم"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          updateNumber(contact.id, {
                            interested: contact.interested === false ? null : false,
                          })
                        }
                        className={`p-1 rounded transition-colors ${
                          contact.interested === false
                            ? "bg-red-600 text-white"
                            : "bg-zinc-100 text-zinc-400 hover:bg-red-100 hover:text-red-600"
                        }`}
                        disabled={!contact.answered}
                        title="غير مهتم"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() =>
                          updateNumber(contact.id, {
                            featured: contact.featured === true ? null : true,
                          })
                        }
                        className={`p-1 rounded transition-colors ${
                          contact.featured === true
                            ? "bg-yellow-600 text-white"
                            : "bg-zinc-100 text-zinc-400 hover:bg-yellow-100 hover:text-yellow-600"
                        }`}
                        disabled={!contact.answered}
                        title="مميز"
                      >
                        <Star className="w-4 h-4" fill={contact.featured === true ? "currentColor" : "none"} />
                      </button>
                      <button
                        onClick={() =>
                          updateNumber(contact.id, {
                            featured: contact.featured === false ? null : false,
                          })
                        }
                        className={`p-1 rounded transition-colors ${
                          contact.featured === false
                            ? "bg-zinc-600 text-white"
                            : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
                        }`}
                        disabled={!contact.answered}
                        title="غير مميز"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <select
                      value={contact.actionType}
                      onChange={(e) =>
                        updateNumber(contact.id, {
                          actionType: e.target.value as "none" | "viewing" | "booking",
                        })
                      }
                      className="px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={!contact.answered || contact.interested !== true}
                    >
                      <option value="none">لا يوجد</option>
                      <option value="viewing">معاينة</option>
                      <option value="booking">حجز</option>
                    </select>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => openMessagesDialog(contact)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>({contact.messages.length})</span>
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="text"
                      value={contact.notes}
                      onChange={(e) =>
                        updateNumber(contact.id, { notes: e.target.value })
                      }
                      placeholder="أضف ملاحظة..."
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <UpcomingAppointments appointments={upcomingAppointments} />

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h4 className="font-semibold text-blue-900 mb-2">ملاحظة</h4>
        <p className="text-sm text-blue-700">
          يمكنك تحديث حالة كل رقم باستخدام خانات الاختيار. البيانات حالياً تخزن في المتصفح فقط.
          لحفظ البيانات بشكل دائم ومشاركتها مع فريقك، يمكنك ربط النظام بقاعدة بيانات Supabase من
          <strong> صفحة الإعدادات في Make</strong>.
        </p>
      </div>

      {selectedMessages?.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeMessagesDialog}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold text-zinc-900">الرسائل المرسلة</h3>
                <button
                  onClick={closeMessagesDialog}
                  className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6 text-zinc-600" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-zinc-600" />
                <div>
                  <p className="font-semibold text-zinc-900">{selectedMessages.contact.name}</p>
                  <p className="text-sm text-zinc-600 font-mono">{selectedMessages.contact.number}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedMessages.contact.messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-zinc-300 mx-auto mb-3" />
                  <p className="text-zinc-500">لا توجد رسائل بعد</p>
                </div>
              ) : (
                selectedMessages.contact.messages.map((msg) => (
                  <div key={msg.id} className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-zinc-900 mb-2">{msg.text}</p>
                    <div className="flex items-center justify-between text-sm text-zinc-600">
                      <span>{msg.sentBy}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 border-t border-zinc-200">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(selectedMessages.contact.id);
                    }
                  }}
                  placeholder="اكتب رسالة جديدة..."
                  className="flex-1 px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => sendMessage(selectedMessages.contact.id)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  إرسال
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
