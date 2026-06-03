import Layout from "../components/Layout";
import { fetchDashboardPageData } from "../lib/page-auth";

const STAGE_LABELS = {
  new: "وارد جديد",
  interested: "مهتم",
  contacted: "تم التواصل",
  follow_up: "متابعة",
  won: "تم الحجز/البيع",
  closed: "مغلق"
};

const STAGE_ORDER = ["new", "interested", "contacted", "follow_up", "won", "closed"];

export async function getServerSideProps(context) {
  return fetchDashboardPageData(context, { includeContacts: true });
}

export default function PipelinePage({ initialData }) {
  const contacts = initialData?.contacts || [];
  const columns = STAGE_ORDER.map(stage => ({
    key: stage,
    title: STAGE_LABELS[stage],
    contacts: contacts.filter(contact => contact.stage === stage)
  }));

  return (
    <Layout
      title="المراحل"
      subtitle="تنظيم حركة كل رقم من أول وصوله حتى الإغلاق، مع رؤية أوضح للاهتمام والمتابعة والحجز"
    >
      <section className="metric-grid">
        {columns.map(column => (
          <article className="metric-card" key={column.key}>
            <p>{column.title}</p>
            <strong>{column.contacts.length}</strong>
            <span>داخل هذه المرحلة</span>
          </article>
        ))}
      </section>

      <section className="pipeline-grid">
        {columns.map(column => (
          <section className="pipeline-column" key={column.key}>
            <div className="pipeline-column-head">
              <h3>{column.title}</h3>
              <span>{column.contacts.length}</span>
            </div>

            <div className="pipeline-cards">
              {column.contacts.map(contact => (
                <article className="pipeline-card" key={contact.identifier}>
                  <strong>{contact.name || "بدون اسم"}</strong>
                  <span>{contact.phoneNumber}</span>
                  <p>{contact.lastMessage || "لا توجد رسالة محفوظة"}</p>
                  <div className="pipeline-tags">
                    <span className={`type-pill ${contact.leadCategory === "returning" ? "returning" : "new"}`}>
                      {contact.leadCategory === "returning" ? "سابق" : "جديد"}
                    </span>
                    <span className="status-badge active">
                      {contact.assignedEmployee || "بدون مسؤول"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </section>
    </Layout>
  );
}
