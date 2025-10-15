const BASE_URL = import.meta.env.VITE_API_URL ?? "";

let authToken: string | null = localStorage.getItem("token") ?? null;

function withAuth(init?: RequestInit, hasBody: boolean = false): RequestInit {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (authToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }
  return {
    ...init,
    headers,
    credentials: init?.credentials ?? "include",
  };
}

async function toJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      // FastAPI often returns { detail: "..." }
      const data = (await res.clone().json()) as unknown;
      if (
        typeof data === "object" &&
        data !== null &&
        "detail" in data &&
        typeof (data as { detail: unknown }).detail === "string"
      ) {
        msg = `${res.status} ${(data as { detail: string }).detail}`;
      }
    } catch {
      const text = await res.text().catch(() => "");
      if (text) msg = `${msg}: ${text}`;
    }
    throw new Error(msg);
  }
  // Handle 204/empty JSON safely
  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, init?: RequestInit) =>
    fetch(`${BASE_URL}${path}`, { ...withAuth(init, false), method: "GET" }).then(toJson<T>),

  post: <T>(path: string, body: unknown, init?: RequestInit) =>
    fetch(`${BASE_URL}${path}`, {
      ...withAuth(init, true),
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }).then(toJson<T>),

  put: <T>(path: string, body: unknown, init?: RequestInit) =>
    fetch(`${BASE_URL}${path}`, {
      ...withAuth(init, true),
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    }).then(toJson<T>),

  delete: <T>(path: string, init?: RequestInit) =>
    fetch(`${BASE_URL}${path}`, { ...withAuth(init, false), method: "DELETE" }).then(toJson<T>),

  // Optional helpers (use in Login to persist the token cleanly)
  setToken(token: string): void {
    authToken = token;
    localStorage.setItem("token", token);
  },
  clearToken(): void {
    authToken = null;
    localStorage.removeItem("token");
  },
  getToken(): string | null {
    return authToken;
  },
};
