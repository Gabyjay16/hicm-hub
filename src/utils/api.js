let csrfToken = "";

export function setCsrfToken(value = "") {
  csrfToken = value;
}

export async function api(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const mutationHeaders = !["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken ? { "X-CSRF-Token": csrfToken } : {};
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    ...options,
    headers: options.body instanceof FormData
      ? { ...mutationHeaders, ...(options.headers || {}) }
      : { "Content-Type": "application/json", ...mutationHeaders, ...(options.headers || {}) },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new CustomEvent("hicm:session-expired"));
    const error = new Error(data.error || "Request failed.");
    error.status = response.status;
    error.code = data.code;
    throw error;
  }
  return data;
}

export async function apiBlob(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const mutationHeaders = !["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken ? { "X-CSRF-Token": csrfToken } : {};
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    ...options,
    headers: { ...mutationHeaders, ...(options.headers || {}) },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) window.dispatchEvent(new CustomEvent("hicm:session-expired"));
    const error = new Error(data.error || "Media could not be opened.");
    error.status = response.status;
    throw error;
  }
  return response.blob();
}

export function deleteJson(path, body = {}) {
  return api(path, { method: "DELETE", body: JSON.stringify(body) });
}

export function postJson(path, body) {
  return api(path, { method: "POST", body: JSON.stringify(body) });
}

export function patchJson(path, body) {
  return api(path, { method: "PATCH", body: JSON.stringify(body) });
}
