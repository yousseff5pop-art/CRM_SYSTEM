import { useState } from "react";
import Link from "next/link";
import Layout from "../../components/Layout";
import { fetchJson } from "../../lib/api";
import { fetchDashboardPageData } from "../../lib/page-auth";

const ACTION_OPTIONS = [
  { value: "none", label: "لا يوجد" },
  { value: "viewing", label: "معاينة" },
  { value: "booking", label: "حجز" }
];

function formatNumber(value) {
  return new Intl.NumberFormat("ar-EG").format(value || 0);
}

function formatDateTime(value) {
  if (!value) return "غير محدد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير محدد";

  return date.toLocaleString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function toDateValue(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function toDateTimeValue(value) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60000);
  return adjusted.toISOString().slice(0, 16);
}

function getUnitStats(contacts) {
  return {
    total: contacts.length,
    contacted: contacts.filter(contact => contact.contacted).length,
    answered: contacts.filter(contact => contact.replyStatus === "replied").length,
    interested: contacts.filter(contact => contact.interestStatus === "interested").length,
    actions: contacts.filter(
      contact => contact.actionType === "viewing" || contact.actionType === "booking"
    ).length,
    followUps: contacts.filter(contact => contact.followUpAt).length
  };
}

export async function getServerSideProps(context) {
  const result = await fetchDashboardPageData(context, { includeContacts: true });

  if (result.redirect) {
    return result;
  }

  const data = result.props.initialData;
  const unit = (data.units || []).find(item => item.id === context.params.id);

  if (!unit) {
    return { notFound: true };
  }

  const unitReport = {
    id: unit.id,
    title: unit.title,
    status: unit.status,
    contacts: (data.contacts || []).filter(contact => (contact.unitIds || []).includes(unit.id))
  };

  return {
    props: {
      initialData: data,
      initialUnitReport: unitReport,
      initialUser: result.props.initialUser
    }
  };
}

export default function UnitPage({ initialData, initialUnitReport }) {
  const [data, setData] = useState(initialData);
  const [unitReport, setUnitReport] = useState(initialUnitReport);
  const [activeContact, setActiveContact] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [busyIdentifier, setBusyIdentifier] = useState("");

  const unitStats = getUnitStats(unitReport.contacts || []);
  const upcomingAppointments = [...(unitReport.contacts || [])]
    .filter(contact => contact.followUpAt)
    .sort((left, right) => new Date(left.followUpAt) - new Date(right.followUpAt));

  async function refresh(selectedIdentifier) {
    const [dashboard, contacts] = await Promise.all([
      fetchJson("/api/dashboard", { cache: "no-store" }),
      fetchJson(`/api/contacts?unitId=${unitReport.id}`, { cache: "no-store" })
    ]);
    const payload = { ...dashboard, contacts };
    setData(payload);

    const currentUnit = (payload.units || []).find(item => item.id === unitReport.id);
    const nextUnitReport = currentUnit
      ? { id: currentUnit.id, title: currentUnit.title, status: currentUnit.status, contacts }
      : unitReport;
    setUnitReport(nextUnitReport);

    if (selectedIdentifier) {
      const refreshed = (nextUnitReport.contacts || []).find(
        contact => contact.identifier === selectedIdentifier
      );
      setActiveContact(refreshed || null);
    }
  }

  async function updateContact(identifier, payload) {
    setBusyIdentifier(identifier);
    try {
      await fetchJson("/api/contacts/update", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ identifier, ...payload })
      });
      await refresh(activeContact?.identifier || identifier);
    } finally {
      setBusyIdentifier("");
    }
  }

  async function sendMessage() {
    if (!activeContact || !newMessage.trim()) return;
    const outgoing = newMessage.trim();
    await fetchJson("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ phone: activeContact.phoneRaw, message: outgoing })
    });
    setNewMessage("");
    await openContact(activeContact.identifier);
  }

  async function openContact(identifier) {
    const payload = await fetchJson(`/api/contacts/${identifier}`, { cache: "no-store" });
    setActiveContact(payload.contact);
  }

  return (
    <Layout
      title={unitReport.title}
      subtitle="إدارة الأرقام والمتابعة اليومية"
      headerAction={
        <Link href="/" className="header-action">
          الصفحة الرئيسية
        </Link>
      }
    >
      <section className="metric-grid unit-metric-grid">
        <article className="metric-card">
          <p>إجمالي الأرقام</p>
          <strong>{formatNumber(unitStats.total)}</strong>
        </article>
        <article className="metric-card">
          <p>تم الاتصال</p>
          <strong className="tone-primary">{formatNumber(unitStats.contacted)}</strong>
        </article>
        <article className="metric-card">
          <p>رد على المكالمة</p>
          <strong className="tone-success">{formatNumber(unitStats.answered)}</strong>
        </article>
        <article className="metric-card">
          <p>مهتم</p>
          <strong className="tone-violet">{formatNumber(unitStats.interested)}</strong>
        </article>
        <article className="metric-card">
          <p>معاينة/حجز</p>
          <strong className="tone-warning">{formatNumber(unitStats.actions)}</strong>
        </article>
        <article className="metric-card">
          <p>مواعيد قادمة</p>
          <strong className="tone-danger">{formatNumber(unitStats.followUps)}</strong>
        </article>
      </section>

      <section className="panel-card">
        <div className="section-heading">
          <h3>قائمة الأرقام</h3>
          <span>{formatNumber(unitReport.contacts.length)} رقم</span>
        </div>

        <div className="table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الرقم</th>
                <th>الموظف المسؤول</th>
                <th>نوع الرقم</th>
                <th>تاريخ التواصل</th>
                <th>ميعاد المعاينة/الاتصال</th>
                <th>تحويل لوحدة</th>
                <th>تم التواصل</th>
                <th>رد</th>
                <th>مهتم</th>
                <th>غير مهتم</th>
              </tr>
            </thead>
            <tbody>
              {unitReport.contacts.map(contact => (
                <tr
                  key={contact.identifier}
                  className={busyIdentifier === contact.identifier ? "row-busy" : ""}
                >
                  <td className="contact-name-cell">
                    <strong>{contact.name || "بدون اسم"}</strong>
                  </td>
                  <td>{contact.phoneNumber}</td>
                  <td>
                    <select
                      value={contact.assignedEmployee || ""}
                      onChange={event =>
                        updateContact(contact.identifier, {
                          assignedEmployee: event.target.value
                        })
                      }
                    >
                      <option value="">غير محدد</option>
                      {(data?.employees || []).map(employee => (
                        <option key={employee.id} value={employee.name}>
                          {employee.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span
                      className={`type-pill ${
                        contact.leadCategory === "returning" ? "returning" : "new"
                      }`}
                    >
                      {contact.leadCategory === "returning" ? "سابق" : "جديد"}
                    </span>
                  </td>
                  <td>
                    <input
                      type="date"
                      value={toDateValue(contact.contactDate)}
                      onChange={event =>
                        updateContact(contact.identifier, { contactDate: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="datetime-local"
                      value={toDateTimeValue(contact.followUpAt)}
                      onChange={event =>
                        updateContact(contact.identifier, { followUpAt: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <select
                      value={(contact.unitIds || [])[0] || ""}
                      onChange={event =>
                        updateContact(contact.identifier, {
                          unitIds: event.target.value ? [event.target.value] : []
                        })
                      }
                    >
                      <option value="">بدون وحدة</option>
                      {(data?.units || []).map(unit => (
                        <option key={unit.id} value={unit.id}>
                          {unit.title}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={Boolean(contact.contacted)}
                      onChange={event =>
                        updateContact(contact.identifier, {
                          contacted: event.target.checked,
                          contactDate: event.target.checked
                            ? new Date().toISOString()
                            : null
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={contact.replyStatus === "replied"}
                      onChange={event =>
                        updateContact(contact.identifier, {
                          replyStatus: event.target.checked ? "replied" : "no_reply"
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={contact.interestStatus === "interested"}
                      onChange={event =>
                        updateContact(contact.identifier, {
                          interestStatus: event.target.checked ? "interested" : null
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={contact.interestStatus === "not_interested"}
                      onChange={event =>
                        updateContact(contact.identifier, {
                          interestStatus: event.target.checked ? "not_interested" : null
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel-card">
        <div className="section-heading">
          <h3>تفاصيل المتابعة</h3>
        </div>

        <div className="table-wrap">
          <table className="crm-table secondary-table">
            <thead>
              <tr>
                <th>تاريخ التواصل</th>
                <th>ميعاد المعاينة/الاتصال</th>
                <th>تحويل لوحدة</th>
                <th>تم التواصل</th>
                <th>رد</th>
                <th>مهتم</th>
                <th>رقم مميز</th>
                <th>الإجراء</th>
                <th>الرسائل</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {unitReport.contacts.map(contact => (
                <tr key={`${contact.identifier}-details`}>
                  <td>
                    <input
                      type="date"
                      value={toDateValue(contact.contactDate)}
                      onChange={event =>
                        updateContact(contact.identifier, { contactDate: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="datetime-local"
                      value={toDateTimeValue(contact.followUpAt)}
                      onChange={event =>
                        updateContact(contact.identifier, { followUpAt: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <select
                      value={(contact.unitIds || [])[0] || ""}
                      onChange={event =>
                        updateContact(contact.identifier, {
                          unitIds: event.target.value ? [event.target.value] : []
                        })
                      }
                    >
                      <option value="">بدون وحدة</option>
                      {(data?.units || []).map(unit => (
                        <option key={unit.id} value={unit.id}>
                          {unit.title}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={Boolean(contact.contacted)}
                      onChange={event =>
                        updateContact(contact.identifier, {
                          contacted: event.target.checked,
                          contactDate: event.target.checked
                            ? new Date().toISOString()
                            : null
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={contact.replyStatus === "replied"}
                      onChange={event =>
                        updateContact(contact.identifier, {
                          replyStatus: event.target.checked ? "replied" : "no_reply"
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={contact.interestStatus === "interested"}
                      onChange={event =>
                        updateContact(contact.identifier, {
                          interestStatus: event.target.checked ? "interested" : null
                        })
                      }
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`icon-toggle ${contact.vip ? "active-star" : ""}`}
                      onClick={() =>
                        updateContact(contact.identifier, { vip: !Boolean(contact.vip) })
                      }
                    >
                      ★
                    </button>
                  </td>
                  <td>
                    <select
                      value={contact.actionType || "none"}
                      onChange={event =>
                        updateContact(contact.identifier, {
                          actionType: event.target.value
                        })
                      }
                    >
                      {ACTION_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      className="message-button"
                      type="button"
                      onClick={() => openContact(contact.identifier)}
                    >
                      ({formatNumber((contact.messages || []).length)}) الرسائل
                    </button>
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="أضف"
                      defaultValue={contact.notes || ""}
                      onBlur={event =>
                        updateContact(contact.identifier, { notes: event.target.value })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel-card appointments-panel">
        <div className="section-heading">
          <h3>المواعيد القادمة</h3>
        </div>

        <div className="appointments-list">
          {upcomingAppointments.length ? (
            upcomingAppointments.map(contact => (
              <article className="appointment-card" key={`appointment-${contact.identifier}`}>
                <div>
                  <strong>{contact.name || "بدون اسم"}</strong>
                  <span>{contact.phoneNumber}</span>
                  <p>{formatDateTime(contact.followUpAt)}</p>
                </div>
                <span className="appointment-tag">
                  {contact.actionType === "booking"
                    ? "حجز"
                    : contact.actionType === "viewing"
                      ? "معاينة"
                      : "اتصال"}
                </span>
              </article>
            ))
          ) : (
            <p className="empty-state">لا توجد مواعيد مجدولة حالياً.</p>
          )}
        </div>
      </section>

      {activeContact ? (
        <div className="modal-backdrop" onClick={() => setActiveContact(null)}>
          <div className="modal-card" onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{activeContact.name || activeContact.phoneNumber}</h3>
                <p>{activeContact.phoneNumber}</p>
              </div>
              <button
                className="close-button"
                type="button"
                onClick={() => setActiveContact(null)}
              >
                ×
              </button>
            </div>

            <div className="messages-stack">
              {(activeContact.messages || []).length ? (
                activeContact.messages.map(message => (
                  <article className="message-card" key={message.id}>
                    <div className="message-meta">
                      <strong>{message.fromMe ? "أنت" : "العميل"}</strong>
                      <span>{formatDateTime(message.isoTime)}</span>
                    </div>
                    <p>{message.message}</p>
                  </article>
                ))
              ) : (
                <p className="empty-state">لا توجد رسائل لهذا الرقم.</p>
              )}
            </div>

            <label className="form-field">
              <span>رسالة جديدة</span>
              <textarea
                rows="4"
                value={newMessage}
                onChange={event => setNewMessage(event.target.value)}
                placeholder="اكتب الرسالة هنا..."
              />
            </label>

            <div className="modal-actions">
              <button className="primary-button" type="button" onClick={sendMessage}>
                إضافة الرسالة
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
