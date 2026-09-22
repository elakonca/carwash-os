import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-sm text-slate-500">Yükleniyor...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
