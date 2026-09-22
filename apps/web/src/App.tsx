import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { LoginPage } from "@/pages/login-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { AcceptPage } from "@/pages/accept-page";
import { WorkOrderPage } from "@/pages/work-order-page";
import { CustomersPage } from "@/pages/customers-page";
import { CustomerDetailPage } from "@/pages/customer-detail-page";
import { VehiclesPage } from "@/pages/vehicles-page";
import { VehicleHistoryPage } from "@/pages/vehicle-history-page";
import { AppointmentsPage } from "@/pages/appointments-page";
import { ZonesPage } from "@/pages/zones-page";
import { StaffPage } from "@/pages/staff-page";
import { ServicesPage } from "@/pages/services-page";
import { CustomerPortalPage } from "@/pages/customer-portal-page";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route index element={<DashboardPage />} />
                <Route path="accept" element={<AcceptPage />} />
                <Route path="work-orders/:id" element={<WorkOrderPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="customers/:id" element={<CustomerDetailPage />} />
                <Route path="vehicles" element={<VehiclesPage />} />
                <Route path="vehicles/:id" element={<VehicleHistoryPage />} />
                <Route path="appointments" element={<AppointmentsPage />} />
                <Route path="zones" element={<ZonesPage />} />
                <Route path="staff" element={<StaffPage />} />
                <Route path="services" element={<ServicesPage />} />
                <Route path="portal" element={<CustomerPortalPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
