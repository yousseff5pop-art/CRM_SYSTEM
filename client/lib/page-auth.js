const INTERNAL_API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.API_INTERNAL_URL ||
  `http://127.0.0.1:${process.env.SERVER_PORT || "3001"}`;

async function fetchWithCookies(context, endpoint) {
  return fetch(`${INTERNAL_API_URL}${endpoint}`, {
    headers: {
      cookie: context.req.headers.cookie || ""
    },
    cache: "no-store"
  });
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

export async function fetchDashboardPageData(context, options = {}) {
  const authResponse = await fetchWithCookies(context, "/api/auth/me");

  if (authResponse.status === 401) {
    return {
      redirect: {
        destination: "/login",
        permanent: false
      }
    };
  }

  if (!authResponse.ok) {
    throw new Error("Failed to load authenticated user");
  }

  const authPayload = await readJson(authResponse);
  const dashboardResponse = await fetchWithCookies(context, "/api/dashboard");

  if (dashboardResponse.status === 401) {
    return {
      redirect: {
        destination: "/login",
        permanent: false
      }
    };
  }

  if (!dashboardResponse.ok) {
    throw new Error("Failed to load dashboard");
  }

  const initialData = await readJson(dashboardResponse);

  if (options.includeContacts) {
    const contactsResponse = await fetchWithCookies(context, "/api/contacts");
    if (!contactsResponse.ok) {
      throw new Error("Failed to load contacts");
    }
    initialData.contacts = await readJson(contactsResponse);
  }

  return {
    props: {
      initialData,
      initialUser: authPayload.user || null
    }
  };
}
