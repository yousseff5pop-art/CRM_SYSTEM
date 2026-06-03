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

export default function ReturningLeadsPage({ initialData }) {
  const leads =
    initialData?.contacts?.filter(contact => contact.leadCategory === "returning") || [];

  return (
    <Layout
      title="الأرقام السابقة"
      subtitle="هذه الصفحة للأرقام التي تواصلت معك من قبل ثم عادت مرة أخرى، لذلك أولويتها أعلى في المتابعة"
    >
      <section className="metric-grid">
        <article className="metric-card">
          <p>إجمالي السابقة</p>
          <strong className="tone-primary">{leads.length}</strong>
          <span>عودة تواصل</span>
        </article>
        <article className="metric-card">
          <p>أرقام مميزة</p>
          <strong className="tone-warning">{leads.filter(contact => contact.vip).length}</strong>
          <span>تحتاج اهتمام خاص</span>
        </article>
        <article className="metric-card">
          <p>تم التواصل</p>
          <strong className="tone-success">
            {leads.filter(contact => contact.contacted).length}
          </strong>
          <span>تم التعامل معها</span>
        </article>
        <article className="metric-card">
          <p>مواعيد متابعة</p>
          <strong className="tone-violet">
            {leads.filter(contact => contact.followUpAt).length}
          </strong>
          <span>متابعات مجدولة</span>
        </article>
      </section>

      <section className="panel-card">
        <div className="section-heading">
          <h3>قائمة الأرقام السابقة</h3>
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
                <span className="type-pill returning">سابق</span>
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
