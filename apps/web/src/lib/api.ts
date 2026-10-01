import { DEMO_MODE, handleDemoRequest } from "@/lib/demo-api";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  businessId: string;
};

type ApiError = { error?: { code?: string; message?: string } };

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const data = (await res.json()) as T & ApiError;
  if (!res.ok) {
    throw new Error(data.error?.message || `İstek başarısız (${res.status})`);
  }
  return data;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (DEMO_MODE) return "demo-access";
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { accessToken: string };
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.removeItem("refreshToken");
      return data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  if (DEMO_MODE) {
    return handleDemoRequest<T>(path, options);
  }

  const token = localStorage.getItem("accessToken");
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(path.startsWith("/api") ? path : `/api${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && retry && !path.includes("/auth/login")) {
    const next = await refreshAccessToken();
    if (next) return api<T>(path, options, false);
  }

  return parse<T>(res);
}

export const authApi = {
  login: (email: string, password: string) =>
    api<{ accessToken: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => api<{ user: AuthUser; business: { id: string; name: string } | null }>("/auth/me"),
  logout: () => api<void>("/auth/logout", { method: "POST" }),
};
