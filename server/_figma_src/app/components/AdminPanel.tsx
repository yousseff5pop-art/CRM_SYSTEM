import { useState } from "react";
import { Shield, Plus, Trash2, Eye, EyeOff, Users, TrendingUp } from "lucide-react";

interface Unit {
  id: string;
  name: string;
  isActive: boolean;
}

interface Employee {
  id: string;
  name: string;
}

interface AdCampaign {
  id: string;
  name: string;
  isActive: boolean;
  startDate: string;
}

export function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [units, setUnits] = useState<Unit[]>([
    { id: "1", name: "وحدة أحمد محمد", isActive: true },
    { id: "2", name: "وحدة سارة علي", isActive: true },
    { id: "3", name: "وحدة محمود حسن", isActive: true },
    { id: "4", name: "وحدة نور الدين", isActive: false },
  ]);

  const [employees, setEmployees] = useState<Employee[]>([
    { id: "nada", name: "ندى" },
    { id: "youssef", name: "يوسف" },
    { id: "salma", name: "سلمى" },
    { id: "ahmed", name: "أحمد" },
    { id: "sara", name: "سارة" },
  ]);

  const [adCampaigns, setAdCampaigns] = useState<AdCampaign[]>([
    { id: "1", name: "إعلان فيسبوك - شقق التجمع", isActive: true, startDate: "2026-04-01" },
    { id: "2", name: "إعلان إنستجرام - عروض الربيع", isActive: true, startDate: "2026-04-10" },
    { id: "3", name: "إعلان جوجل - شقق للبيع", isActive: true, startDate: "2026-04-05" },
    { id: "4", name: "إعلان تيك توك - وحدات جديدة", isActive: false, startDate: "2026-03-20" },
  ]);

  const [newUnitName, setNewUnitName] = useState("");
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newAdName, setNewAdName] = useState("");
  const [newAdDate, setNewAdDate] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "admin123") {
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("كلمة المرور غير صحيحة");
    }
  };

  const addUnit = () => {
    if (!newUnitName.trim()) return;
    const newUnit: Unit = {
      id: Date.now().toString(),
      name: newUnitName,
      isActive: true,
    };
    setUnits([...units, newUnit]);
    setNewUnitName("");
  };

  const deleteUnit = (id: string) => {
    setUnits(units.filter((u) => u.id !== id));
  };

  const toggleUnitStatus = (id: string) => {
    setUnits(
      units.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u))
    );
  };

  const addEmployee = () => {
    if (!newEmployeeName.trim()) return;
    const newEmployee: Employee = {
      id: Date.now().toString(),
      name: newEmployeeName,
    };
    setEmployees([...employees, newEmployee]);
    setNewEmployeeName("");
  };

  const deleteEmployee = (id: string) => {
    setEmployees(employees.filter((e) => e.id !== id));
  };

  const addAdCampaign = () => {
    if (!newAdName.trim() || !newAdDate) return;
    const newAd: AdCampaign = {
      id: Date.now().toString(),
      name: newAdName,
      isActive: true,
      startDate: newAdDate,
    };
    setAdCampaigns([...adCampaigns, newAd]);
    setNewAdName("");
    setNewAdDate("");
  };

  const deleteAdCampaign = (id: string) => {
    setAdCampaigns(adCampaigns.filter((a) => a.id !== id));
  };

  const toggleAdStatus = (id: string) => {
    setAdCampaigns(
      adCampaigns.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a))
    );
  };

  const activeAdsCount = adCampaigns.filter((a) => a.isActive).length;
  const activeUnitsCount = units.filter((u) => u.isActive).length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl border border-zinc-200 w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-blue-100 rounded-full">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 text-center mb-2">
            لوحة تحكم المدير
          </h2>
          <p className="text-zinc-600 text-center mb-6">
            يرجى إدخال كلمة المرور للوصول
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="أدخل كلمة المرور"
              />
            </div>
            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}
            <button
              type="submit"
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              دخول
            </button>
          </form>
          <p className="text-xs text-zinc-500 text-center mt-4">
            كلمة المرور التجريبية: admin123
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900 mb-2">لوحة تحكم المدير</h2>
          <p className="text-zinc-600">إدارة الوحدات والموظفين والإعلانات</p>
        </div>
        <button
          onClick={() => setIsAuthenticated(false)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          تسجيل الخروج
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-zinc-200">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-6 h-6 text-blue-600" />
            <h3 className="font-semibold text-zinc-900">الوحدات النشطة</h3>
          </div>
          <p className="text-4xl font-bold text-blue-600">{activeUnitsCount}</p>
          <p className="text-sm text-zinc-600 mt-1">من {units.length} وحدة</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-zinc-200">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <h3 className="font-semibold text-zinc-900">الإعلانات النشطة</h3>
          </div>
          <p className="text-4xl font-bold text-green-600">{activeAdsCount}</p>
          <p className="text-sm text-zinc-600 mt-1">من {adCampaigns.length} إعلان</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-zinc-200">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-6 h-6 text-purple-600" />
            <h3 className="font-semibold text-zinc-900">الموظفين</h3>
          </div>
          <p className="text-4xl font-bold text-purple-600">{employees.length}</p>
          <p className="text-sm text-zinc-600 mt-1">موظف نشط</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="p-6 border-b border-zinc-200 bg-blue-50">
            <h3 className="text-xl font-bold text-zinc-900">إدارة الوحدات</h3>
          </div>
          <div className="p-6">
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                placeholder="اسم الوحدة الجديدة"
                className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={addUnit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة
              </button>
            </div>
            <div className="space-y-3">
              {units.map((unit) => (
                <div
                  key={unit.id}
                  className="flex items-center justify-between p-4 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-zinc-900">{unit.name}</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        unit.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {unit.isActive ? "نشط" : "غير نشط"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleUnitStatus(unit.id)}
                      className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                      title={unit.isActive ? "إيقاف" : "تفعيل"}
                    >
                      {unit.isActive ? (
                        <EyeOff className="w-4 h-4 text-zinc-600" />
                      ) : (
                        <Eye className="w-4 h-4 text-zinc-600" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteUnit(unit.id)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="p-6 border-b border-zinc-200 bg-purple-50">
            <h3 className="text-xl font-bold text-zinc-900">إدارة الموظفين</h3>
          </div>
          <div className="p-6">
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                value={newEmployeeName}
                onChange={(e) => setNewEmployeeName(e.target.value)}
                placeholder="اسم الموظف الجديد"
                className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <button
                onClick={addEmployee}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة
              </button>
            </div>
            <div className="space-y-3">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-4 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  <span className="font-semibold text-zinc-900">{employee.name}</span>
                  <button
                    onClick={() => deleteEmployee(employee.id)}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="p-6 border-b border-zinc-200 bg-green-50">
          <h3 className="text-xl font-bold text-zinc-900">إدارة الإعلانات</h3>
        </div>
        <div className="p-6">
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={newAdName}
              onChange={(e) => setNewAdName(e.target.value)}
              placeholder="اسم الإعلان"
              className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <input
              type="date"
              value={newAdDate}
              onChange={(e) => setNewAdDate(e.target.value)}
              className="px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <button
              onClick={addAdCampaign}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              إضافة
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adCampaigns.map((ad) => (
              <div
                key={ad.id}
                className="flex items-center justify-between p-4 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-zinc-900">{ad.name}</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ad.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {ad.isActive ? "نشط" : "متوقف"}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600">
                    بدأ في: {new Date(ad.startDate).toLocaleDateString('ar-EG')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAdStatus(ad.id)}
                    className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                    title={ad.isActive ? "إيقاف" : "تفعيل"}
                  >
                    {ad.isActive ? (
                      <EyeOff className="w-4 h-4 text-zinc-600" />
                    ) : (
                      <Eye className="w-4 h-4 text-zinc-600" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteAdCampaign(ad.id)}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
