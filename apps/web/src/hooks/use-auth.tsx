import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { canViewPrices, canViewReports, type UserRole } from "@carwash/shared";
import { authApi, type AuthUser } from "@/lib/api";
import { DEMO_MODE } from "@/lib/demo-api";

type AuthState = {
  user: AuthUser | null;
  businessName: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  canSeePrices: boolean;
  canSeeReports: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token && DEMO_MODE) {
      authApi
        .login("owner@aquashine.com", "Owner123!")
        .then(async (data) => {
          localStorage.setItem("accessToken", data.accessToken);
          localStorage.setItem("refreshToken", data.refreshToken);
          setUser(data.user);
          const me = await authApi.me();
          setBusinessName(me.business?.name ?? null);
        })
        .finally(() => setLoading(false));
      return;
    }
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((data) => {
        setUser(data.user);
        setBusinessName(data.business?.name ?? null);
      })
      .catch(() => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      businessName,
      loading,
      canSeePrices: user ? canViewPrices(user.role as UserRole) : false,
      canSeeReports: user ? canViewReports(user.role as UserRole) : false,
      login: async (email, password) => {
        const data = await authApi.login(email, password);
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        setUser(data.user);
        const me = await authApi.me();
        setBusinessName(me.business?.name ?? null);
      },
      logout: async () => {
        await authApi.logout().catch(() => undefined);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setUser(null);
      },
    }),
    [user, businessName, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
}
