const BASE_URL = import.meta.env.VITE_API_URL ?? "";

async function toJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get:     <T>(path: string, init?: RequestInit) =>
    fetch(`${BASE_URL}${path}`, { credentials: "include", ...init }).then(toJson<T>),

  post:    <T>(path: string, body: unknown, init?: RequestInit) =>
    fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
      ...init,
    }).then(toJson<T>),

  put:     <T>(path: string, body: unknown, init?: RequestInit) =>
    fetch(`${BASE_URL}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
      ...init,
    }).then(toJson<T>),

  delete:  <T>(path: string, init?: RequestInit) =>
    fetch(`${BASE_URL}${path}`, {
      method: "DELETE",
      credentials: "include",
      ...init,
    }).then(toJson<T>),
};
