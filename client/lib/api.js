export async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.details ? `${payload.error}: ${payload.details}` : (payload.error || "Request failed"));
  }

  return payload;
}
