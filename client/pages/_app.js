import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AuthContext } from "../lib/auth";
import { fetchJson } from "../lib/api";
import "../styles/app.css";

const PUBLIC_ROUTES = ["/login"];

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [user, setUser] = useState(pageProps.initialUser || null);
  const [loading, setLoading] = useState(!pageProps.initialUser && !PUBLIC_ROUTES.includes(router.pathname));

  async function refreshUser() {
    try {
      const payload = await fetchJson("/api/auth/me", { cache: "no-store" });
      setUser(payload.user || null);
      return payload.user || null;
    } catch {
      setUser(null);
      return null;
    }
  }

  async function logout() {
    await fetchJson("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.replace("/login");
  }

  useEffect(() => {
    if (pageProps.initialUser) {
      setUser(pageProps.initialUser);
      setLoading(false);
      return;
    }

    if (PUBLIC_ROUTES.includes(router.pathname)) {
      setLoading(false);
      return;
    }

    refreshUser().then(currentUser => {
      if (!currentUser) {
        router.replace("/login");
      }
      setLoading(false);
    });
  }, [router.pathname, pageProps.initialUser]);

  useEffect(() => {
    if (!loading && user && router.pathname === "/login") {
      router.replace("/");
    }
  }, [loading, user, router.pathname]);

  const isAdminPage = router.pathname === "/admin";
  useEffect(() => {
    if (!loading && isAdminPage && user && user.role !== "ADMIN") {
      router.replace("/");
    }
  }, [loading, isAdminPage, user]);

  return (
    <>
      <Head>
        <title>نظام إدارة العملاء CRM</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <AuthContext.Provider value={{ user, loading, refreshUser, logout }}>
        {loading && !PUBLIC_ROUTES.includes(router.pathname) ? (
          <div className="app-loading-screen">جاري تجهيز النظام...</div>
        ) : (
          <Component {...pageProps} />
        )}
      </AuthContext.Provider>
    </>
  );
}
