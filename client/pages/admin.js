import { useState } from "react";
import Layout from "../components/Layout";
import { fetchJson } from "../lib/api";
import { fetchDashboardPageData } from "../lib/page-auth";

export async function getServerSideProps(context) {
  const result = await fetchDashboardPageData(context);
  if (result.redirect) return result;
  if (result.props.initialUser?.role !== "ADMIN") {
    return {
      redirect: {
        destination: "/",
        permanent: false
      }
    };
  }
  return result;
}

export default function AdminPage({ initialData }) {
  const [data, setData] = useState(initialData);
  const [newUnit, setNewUnit] = useState("");
  const [newEmployee, setNewEmployee] = useState("");
  const [newAd, setNewAd] = useState({ name: "", startDate: "" });

  async function refresh() {
    const payload = await fetchJson("/api/dashboard", { cache: "no-store" });
    setData(payload);
  }

  async function createUnit() {
    if (!newUnit.trim()) return;
    await fetchJson("/api/units/create", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ title: newUnit })
    });
    setNewUnit("");
    await refresh();
  }

  async function toggleUnit(unit) {
    await fetchJson("/api/units/update", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ id: unit.id, status: unit.status === "active" ? "paused" : "active" })
    });
    await refresh();
  }

  async function deleteUnit(id) {
    await fetchJson("/api/units/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ id })
    });
    await refresh();
  }

  async function createEmployee() {
    if (!newEmployee.trim()) return;
    await fetchJson("/api/employees/create", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ name: newEmployee })
    });
    setNewEmployee("");
    await refresh();
  }

  async function deleteEmployee(id) {
    await fetchJson("/api/employees/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ id })
    });
    await refresh();
  }

  async function createAd() {
    if (!newAd.name.trim() || !newAd.startDate) return;
    await fetchJson("/api/ads/create", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(newAd)
    });
    setNewAd({ name: "", startDate: "" });
    await refresh();
  }

  async function toggleAd(ad) {
    await fetchJson("/api/ads/update", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ id: ad.id, active: !ad.active })
    });
    await refresh();
  }

  async function deleteAd(id) {
    await fetchJson("/api/ads/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ id })
    });
    await refresh();
  }

  return (
    <Layout
      title="لوحة تحكم المدير"
      subtitle="إدارة الوحدات والموظفين والإعلانات"
    >
      <section className="stats-cards-grid">
        <article className="stats-card">
          <p>الوحدات النشطة</p>
          <strong className="tone-blue">{data?.stats?.activeUnitsCount || 0}</strong>
          <span>من {data?.stats?.unitsCount || 0} وحدة</span>
        </article>
        <article className="stats-card">
          <p>الإعلانات النشطة</p>
          <strong className="tone-green">{data?.stats?.activeAdsCount || 0}</strong>
          <span>الحملات الحالية</span>
        </article>
        <article className="stats-card">
          <p>الموظفون</p>
          <strong className="tone-violet">{(data?.employees || []).length}</strong>
          <span>عدد الموظفين</span>
        </article>
      </section>

      <section className="admin-panels-grid">
        <article className="surface-panel panel-blue">
          <div className="section-title">
            <h3>إدارة الوحدات</h3>
          </div>
          <div className="compact-form-row">
            <button className="header-button" type="button" onClick={createUnit}>
              إضافة +
            </button>
            <input
              value={newUnit}
              onChange={event => setNewUnit(event.target.value)}
              placeholder="اسم الوحدة الجديدة"
            />
          </div>
          <div className="admin-list-grid">
            {(data?.units || []).map(unit => (
              <div className="admin-list-card" key={unit.id}>
                <div>
                  <strong>{unit.title}</strong>
                  <span className={`pill ${unit.status === "active" ? "success" : "muted"}`}>
                    {unit.status === "active" ? "نشط" : "غير نشط"}
                  </span>
                </div>
                <div className="row-actions">
                  <button className="tiny-icon-button" type="button" onClick={() => toggleUnit(unit)}>
                    {unit.status === "active" ? "◌" : "◎"}
                  </button>
                  <button className="tiny-icon-button danger" type="button" onClick={() => deleteUnit(unit.id)}>
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="surface-panel panel-violet">
          <div className="section-title">
            <h3>إدارة الموظفين</h3>
          </div>
          <div className="compact-form-row">
            <button className="header-button secondary" type="button" onClick={createEmployee}>
              إضافة +
            </button>
            <input
              value={newEmployee}
              onChange={event => setNewEmployee(event.target.value)}
              placeholder="اسم الموظف الجديد"
            />
          </div>
          <div className="admin-list-grid">
            {(data?.employees || []).map(employee => (
              <div className="admin-list-card" key={employee.id}>
                <strong>{employee.name}</strong>
                <button className="tiny-icon-button danger" type="button" onClick={() => deleteEmployee(employee.id)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="surface-panel panel-green">
        <div className="section-title">
          <h3>إدارة الإعلانات</h3>
        </div>
        <div className="ad-create-row">
          <button className="green-button" type="button" onClick={createAd}>
            إضافة +
          </button>
          <input
            type="date"
            value={newAd.startDate}
            onChange={event => setNewAd(current => ({ ...current, startDate: event.target.value }))}
          />
          <input
            value={newAd.name}
            onChange={event => setNewAd(current => ({ ...current, name: event.target.value }))}
            placeholder="اسم الإعلان"
          />
        </div>

        <div className="ads-grid">
          {(data?.adCampaigns || []).map(ad => (
            <div className="ad-manage-card" key={ad.id}>
              <div className="row-actions">
                <button className="tiny-icon-button danger" type="button" onClick={() => deleteAd(ad.id)}>
                  ×
                </button>
                <button className="tiny-icon-button" type="button" onClick={() => toggleAd(ad)}>
                  {ad.active ? "◌" : "◎"}
                </button>
              </div>
              <div className="ad-manage-copy">
                <strong>{ad.name}</strong>
                <span className={`pill ${ad.active ? "success" : "muted"}`}>
                  {ad.active ? "نشط" : "متوقف"}
                </span>
                <p>بدأ في {new Date(ad.startDate).toLocaleDateString("ar-EG")}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
