import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { APPOINTMENT_STATUS_LABELS } from "@carwash/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, Textarea } from "@/components/ui/forms";

type Appointment = {
  id: string;
  date: string;
  time: string;
  status: keyof typeof APPOINTMENT_STATUS_LABELS;
  estimatedMinutes: number;
  workOrderId?: string | null;
  note?: string | null;
  source?: string;
  customer: { firstName: string; lastName: string };
  vehicle: { plate: string };
  services?: { service?: { name: string } }[];
};

export function AppointmentsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    customerId: "",
    vehicleId: "",
    date: new Date().toISOString().slice(0, 10),
    time: "10:00",
    note: "",
    serviceIds: [] as string[],
  });

  const list = useQuery({
    queryKey: ["appointments"],
    queryFn: () => api<{ items: Appointment[] }>("/appointments"),
  });
  const customers = useQuery({
    queryKey: ["customers-min"],
    queryFn: () => api<{ items: { id: string; firstName: string; lastName: string }[] }>("/customers?pageSize=100"),
  });
  const vehicles = useQuery({
    queryKey: ["vehicles-by-customer", form.customerId],
    enabled: Boolean(form.customerId),
    queryFn: () => api<{ items: { id: string; plate: string }[] }>(`/vehicles?customerId=${form.customerId}`),
  });
  const services = useQuery({
    queryKey: ["services"],
    queryFn: () => api<{ items: { id: string; name: string }[] }>("/services"),
  });

  const create = useMutation({
    mutationFn: () => api("/appointments", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      toast.success("Randevu oluşturuldu");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const convert = useMutation({
    mutationFn: (id: string) =>
      api<{ workOrder: { id: string } }>(`/appointments/${id}/convert`, { method: "POST" }),
    onSuccess: (data) => {
      toast.success("İş emrine dönüştürüldü");
      navigate(`/work-orders/${data.workOrder.id}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    create.mutate();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div>
        <h1 className="mb-4 text-2xl font-semibold">Randevular</h1>
        <div className="space-y-2">
          {(list.data?.items ?? []).map((item) => (
            <Card key={item.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">
                  {item.vehicle.plate} · {item.customer.firstName} {item.customer.lastName}
                </p>
                <p className="text-sm text-slate-500">
                  {String(item.date).slice(0, 10)} {item.time} · {APPOINTMENT_STATUS_LABELS[item.status]}
                </p>
                {item.services?.length ? (
                  <p className="text-xs text-slate-400">
                    {item.services.map((s) => s.service?.name).filter(Boolean).join(", ")}
                  </p>
                ) : null}
                {item.source === "portal" || item.note?.startsWith("[Portal]") ? (
                  <Badge className="mt-1" tone="teal">
                    Müşteri Portalı
                  </Badge>
                ) : null}
              </div>
              {item.workOrderId ? (
                <span className="text-xs text-slate-400">Dönüştürüldü</span>
              ) : (
                <Button size="sm" onClick={() => convert.mutate(item.id)}>
                  İş emrine çevir
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>
      <Card className="h-fit space-y-3 p-5">
        <h2 className="font-semibold">Yeni randevu</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <select
            className="h-10 w-full rounded-lg border px-3 text-sm"
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value, vehicleId: "" })}
          >
            <option value="">Müşteri</option>
            {(customers.data?.items ?? []).map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.firstName} {customer.lastName}
              </option>
            ))}
          </select>
          <select
            className="h-10 w-full rounded-lg border px-3 text-sm"
            value={form.vehicleId}
            onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
          >
            <option value="">Araç</option>
            {(vehicles.data?.items ?? []).map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plate}
              </option>
            ))}
          </select>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          <div className="space-y-1 text-sm">
            {(services.data?.items ?? []).map((service) => (
              <label key={service.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.serviceIds.includes(service.id)}
                  onChange={() =>
                    setForm((current) => ({
                      ...current,
                      serviceIds: current.serviceIds.includes(service.id)
                        ? current.serviceIds.filter((id) => id !== service.id)
                        : [...current.serviceIds, service.id],
                    }))
                  }
                />
                {service.name}
              </label>
            ))}
          </div>
          <Textarea placeholder="Not" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <Button type="submit" className="w-full">Kaydet</Button>
        </form>
      </Card>
    </div>
  );
}
