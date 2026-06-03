import { useMemo, useState } from "react";
import Layout from "../components/Layout";
import { fetchJson } from "../lib/api";
import { fetchDashboardPageData } from "../lib/page-auth";

function formatNumber(value) {
  return new Intl.NumberFormat("ar-EG").format(value || 0);
}

function formatDate(value) {
  if (!value) return "الآن";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "الآن";
  return date.toLocaleString("ar-EG");
}

export async function getServerSideProps(context) {
  return fetchDashboardPageData(context, { includeContacts: true });
}

export default function NumbersPage({ initialData }) {
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState("");

  async function refresh() {
    const [dashboard, contacts] = await Promise.all([
      fetchJson("/api/dashboard", { cache: "no-store" }),
      fetchJson("/api/contacts?unassigned=true", { cache: "no-store" })
    ]);
    setData({ ...dashboard, contacts });
  }

  async function updateContact(identifier, payload) {
    setBusyId(identifier);
    try {
      await fetchJson("/api/contacts/update", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ identifier, ...payload })
      });
      await refresh();
    } finally {
      setBusyId("");
    }
  }

  const contacts = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    const source = [...((data?.contacts || []).filter(contact => !(contact.unitIds || []).length))];

    if (!lowered) {
      return source;
    }

    return source.filter(contact =>
      [contact.name, contact.phoneNumber, contact.lastMessage]
        .join(" ")
        .toLowerCase()
        .includes(lowered)
    );
  }, [data, query]);

  return (
    <Layout
      title="الأرقام الواردة"
      subtitle="رتّب الأرقام الجديدة وحدد الوحدة والموظف المسؤول قبل بدء المتابعة"
    >
      <section className="stats-cards-grid">
        <article className="stats-card">
          <p>غير مصنف</p>
          <strong className="tone-orange">{formatNumber(data?.stats?.unassignedCount)}</strong>
          <span>يحتاج توزيع</span>
        </article>
        <article className="stats-card">
          <p>أرقام اليوم</p>
          <strong className="tone-blue">{formatNumber(data?.stats?.contactsCreatedToday)}</strong>
          <span>الواردة اليوم</span>
        </article>
        <article className="stats-card">
          <p>أرقام جديدة</p>
          <strong className="tone-green">{formatNumber(data?.stats?.newLeadsCount)}</strong>
          <span>أول مرة</span>
        </article>
        <article className="stats-card">
          <p>أرقام سابقة</p>
          <strong className="tone-violet">{formatNumber(data?.stats?.returningLeadsCount)}</strong>
          <span>كلمتنا قبل ذلك</span>
        </article>
      </section>

      <section className="surface-panel">
        <div className="section-title with-search">
          <h3>صندوق الأرقام الواردة</h3>
          <input
            className="search-input"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="ابحث بالاسم أو الرقم أو الرسالة"
          />
        </div>

        <div className="lead-inbox-grid">
          {contacts.map(contact => (
            <article
              className={`lead-inbox-card ${busyId === contact.identifier ? "is-busy" : ""}`}
              key={contact.identifier}
            >
              <div className="lead-inbox-head">
                <div>
                  <strong>{contact.name || "بدون اسم"}</strong>
                  <span>{contact.phoneNumber || "بدون رقم"}</span>
                </div>
                <span className={`pill ${contact.leadCategory === "returning" ? "info" : "success"}`}>
                  {contact.leadCategory === "returning" ? "سابق" : "جديد"}
                </span>
              </div>

              <div className="lead-inbox-message">
                <span>آخر رسالة</span>
                <p>{contact.lastMessage || "لا توجد رسالة محفوظة"}</p>
                <small>{formatDate(contact.updatedAt || contact.createdAt)}</small>
              </div>

              <div className="lead-inbox-controls">
                <label className="field-block">
                  <span>الوحدة</span>
                  <select
                    value={(contact.unitIds || [])[0] || ""}
                    onChange={event =>
                      updateContact(contact.identifier, {
                        unitIds: event.target.value ? [event.target.value] : []
                      })
                    }
                  >
                    <option value="">اختر الوحدة</option>
                    {(data?.units || []).map(unit => (
                      <option key={unit.id} value={unit.id}>
                        {unit.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-block">
                  <span>المسؤول</span>
                  <select
                    value={contact.assignedEmployee || ""}
                    onChange={event =>
                      updateContact(contact.identifier, {
                        assignedEmployee: event.target.value
                      })
                    }
                  >
                    <option value="">اختر الموظف</option>
                    {(data?.employees || []).map(employee => (
                      <option key={employee.id} value={employee.name}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="lead-inbox-actions">
                <button
                  className="primary-link-button as-button"
                  type="button"
                  onClick={() => updateContact(contact.identifier, { contacted: false, replyStatus: "no_reply" })}
                >
                  حفظ التصنيف
                </button>
              </div>
            </article>
          ))}

          {!contacts.length ? <p className="empty-state">لا توجد أرقام واردة غير مصنفة حالياً.</p> : null}
        </div>
      </section>
    </Layout>
  );
}
