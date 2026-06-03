import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../lib/auth";

const navItems = [
  { href: "/", label: "الرئيسية" },
  { href: "/numbers", label: "الأرقام الواردة" },
  { href: "/new-leads", label: "الجديدة" },
  { href: "/returning-leads", label: "السابقة" },
  { href: "/pipeline", label: "المراحل" }
];

export default function Layout({ children, title, subtitle, headerAction, headerSecondaryAction }) {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-left">
          {headerAction || (
            <Link href={router.pathname === "/admin" ? "/" : "/admin"} className="header-button secondary">
              {router.pathname === "/admin" ? "الصفحة الرئيسية" : "لوحة المدير"}
            </Link>
          )}
          {headerSecondaryAction || null}
        </div>

        <div className="brand-area">
          <div className="brand-copy">
            <span className="brand-kicker">بلنا</span>
            <strong>نظام إدارة العملاء CRM</strong>
          </div>
          <div className="brand-icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </header>

      <main className="page-wrap">
        <section className="toolbar-row">
          <nav className="page-tabs">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`page-tab ${router.pathname === item.href ? "active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
            {user?.role === "ADMIN" ? (
              <Link
                href="/admin"
                className={`page-tab ${router.pathname === "/admin" ? "active" : ""}`}
              >
                المدير
              </Link>
            ) : null}
          </nav>

          {user ? (
            <div className="user-actions">
              <div className="user-badge">
                <strong>{user.displayName}</strong>
                <span>{user.role === "ADMIN" ? "مدير" : "موظف"}</span>
              </div>
              <button className="header-button ghost" type="button" onClick={logout}>
                تسجيل الخروج
              </button>
            </div>
          ) : null}
        </section>

        <section className="page-intro">
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </section>

        {children}
      </main>
    </div>
  );
}
