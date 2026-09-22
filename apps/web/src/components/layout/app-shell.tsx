import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Car,
  Globe,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Sparkles,
  Users,
  UserRound,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/layout/error-boundary";
import { ROLE_LABELS } from "@carwash/shared";

const links = [
  { to: "/", label: "Pano", icon: LayoutDashboard },
  { to: "/accept", label: "Araç kabul", icon: Sparkles },
  { to: "/customers", label: "Müşteriler", icon: Users },
  { to: "/vehicles", label: "Araçlar", icon: Car },
  { to: "/appointments", label: "Randevular", icon: CalendarDays },
  { to: "/zones", label: "Alanlar", icon: MapPinned },
  { to: "/staff", label: "Personel", icon: UserRound },
  { to: "/services", label: "Hizmetler", icon: Wrench },
];

export function AppShell() {
  const { user, businessName, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-foam-50 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="flex min-h-screen flex-col bg-ink-950 text-white">
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 font-bold">
            CW
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide">Car Wash OS</p>
            <p className="text-xs text-white/60">{businessName}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-brand-400">Demo</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                  isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 p-3">
          <NavLink
            to="/portal"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                isActive
                  ? "bg-brand-500 text-white"
                  : "bg-white/5 text-brand-400 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <Globe className="h-4 w-4" />
            Müşteri Portalı
          </NavLink>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <p className="text-sm text-slate-500">Operasyon konsolu</p>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-slate-500">
                {user ? ROLE_LABELS[user.role] : ""}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
              Çıkış
            </Button>
          </div>
        </header>
        <main className="min-h-[calc(100vh-4rem)] bg-foam-50 p-6 text-ink-900">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
