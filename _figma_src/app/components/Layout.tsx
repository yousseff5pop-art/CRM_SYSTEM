import { Outlet, Link, useLocation } from "react-router";
import { BarChart3, Home, Shield } from "lucide-react";

export function Layout() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isAdmin = location.pathname === "/admin";

  return (
    <div className="min-h-screen bg-zinc-50" dir="rtl">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-zinc-900">نظام إدارة العملاء CRM</h1>
            </div>
            <div className="flex items-center gap-3">
              {!isHome && !isAdmin && (
                <Link
                  to="/"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span>الصفحة الرئيسية</span>
                </Link>
              )}
              {!isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  <span>لوحة المدير</span>
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span>الصفحة الرئيسية</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
