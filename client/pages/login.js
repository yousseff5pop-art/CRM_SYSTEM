import { useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../lib/auth";
import { fetchJson } from "../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await fetchJson("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(form)
      });
      await refreshUser();
      router.replace("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-logo">ظ†ط¸ط§ظ… ط¥ط¯ط§ط±ط© ط§ظ„ط¹ظ…ظ„ط§ط، CRM</div>
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-icon">â—Œ</div>
        <h2>ظ„ظˆط­ط© طھط­ظƒظ… ط§ظ„ظ…ط¯ظٹط±</h2>
        <p>ظٹط±ط¬ظ‰ ط¥ط¯ط®ط§ظ„ ط§ط³ظ… ط§ظ„ظ…ط³طھط®ط¯ظ… ظˆظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±</p>

        <label className="field-block">
          <span>ط§ط³ظ… ط§ظ„ظ…ط³طھط®ط¯ظ…</span>
          <input
            value={form.username}
            onChange={event => setForm(current => ({ ...current, username: event.target.value }))}
          />
        </label>

        <label className="field-block">
          <span>ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±</span>
          <input
            type="password"
            value={form.password}
            onChange={event => setForm(current => ({ ...current, password: event.target.value }))}
          />
        </label>

        {error ? <div className="feedback-banner error">{error}</div> : null}

        <button className="full-primary-button" type="submit" disabled={busy}>
          {busy ? "ط¬ط§ط±ظٹ ط§ظ„ط¯ط®ظˆظ„..." : "ط¯ط®ظˆظ„"}
        </button>
      </form>
    </div>
  );
}
