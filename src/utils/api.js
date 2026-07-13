export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    ...options,
    headers: options.body instanceof FormData ? options.headers : { "Content-Type": "application/json", ...(options.headers || {}) },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

export function postJson(path, body) {
  return api(path, { method: "POST", body: JSON.stringify(body) });
}

export function patchJson(path, body) {
  return api(path, { method: "PATCH", body: JSON.stringify(body) });
}
