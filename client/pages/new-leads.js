import Layout from "../components/Layout";
import { fetchDashboardPageData } from "../lib/page-auth";

function formatDate(value) {
  if (!value) return "الآن";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "الآن";
  return date.toLocaleString("ar-EG");
}

export async function getServerSideProps(context) {
  return fetchDashboardPageData(context, { includeContacts: true });
}

export default function NewLeadsPage({ initialData }) {
  const leads = initialData?.contacts?.filter(contact => contact.leadCategory === "new") || [];

  return (
    <Layout
      title="الأرقام الجديدة"
      subtitle="هذه الصفحة مخصصة للأرقام التي تكلمت معك لأول مرة وتحتاج فرزاً سريعاً ومتابعة مبكرة"
    >
      <section className="metric-grid">
        <article className="metric-card">
          <p>إجمالي الجدد</p>
          <strong className="tone-success">{leads.length}</strong>
          <span>كلهم أول مرة</span>
        </article>
        <article className="metric-card">
          <p>غير مصنف</p>
          <strong className="tone-warning">
            {leads.filter(contact => !(contact.unitIds || []).length).length}
          </strong>
          <span>يحتاج تحديد وحدة</span>
        </article>
        <article className="metric-card">
          <p>بدون مسؤول</p>
          <strong className="tone-primary">
            {leads.filter(contact => !contact.assignedEmployee).length}
          </strong>
          <span>يحتاج تحديد الموظف</span>
        </article>
        <article className="metric-card">
          <p>تم الرد</p>
          <strong className="tone-violet">
            {leads.filter(contact => contact.replyStatus === "replied").length}
          </strong>
          <span>تفاعل مبدئي</span>
        </article>
      </section>

      <section className="panel-card">
        <div className="section-heading">
          <h3>قائمة الأرقام الجديدة</h3>
          <span>{leads.length} رقم</span>
        </div>

        <div className="lead-list-grid">
          {leads.map(contact => (
            <article className="lead-list-card" key={contact.identifier}>
              <div className="lead-list-head">
                <div>
                  <strong>{contact.name || "بدون اسم"}</strong>
                  <span>{contact.phoneNumber}</span>
                </div>
                <span className="type-pill new">جديد</span>
              </div>

              <div className="lead-list-meta">
                <span>الوحدة: {contact.units?.[0]?.title || "غير محددة"}</span>
                <span>المسؤول: {contact.assignedEmployee || "غير محدد"}</span>
                <span>آخر تحديث: {formatDate(contact.updatedAt)}</span>
              </div>

              <div className="lead-list-message">
                <span>آخر رسالة</span>
                <p>{contact.lastMessage || "لا توجد رسالة محفوظة"}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </Layout>
  );
}
