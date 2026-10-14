import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, Input } from "@/components/ui/forms";
import { Pager } from "@/components/ui/pager";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { withQuery, type Page } from "@/lib/paging";

type Vehicle = {
  id: string;
  plate: string;
  brand?: string;
  model?: string;
  color?: string;
  customer: { id: string; firstName: string; lastName: string };
};

export function VehiclesPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQ = useDebouncedValue(q, 300);
  const [form, setForm] = useState({
    customerId: "",
    plate: "",
    brand: "",
    model: "",
    color: "",
    year: "",
  });

  const vehicles = useQuery({
    queryKey: ["vehicles", debouncedQ, page],
    queryFn: () => api<Page<Vehicle>>(withQuery("/vehicles", { q: debouncedQ, page, pageSize: 20 })),
  });
  const customers = useQuery({
    queryKey: ["customers-min"],
    queryFn: () =>
      api<Page<{ id: string; firstName: string; lastName: string }>>(
        withQuery("/customers", { page: 1, pageSize: 100 }),
      ),
  });

  const create = useMutation({
    mutationFn: () =>
      api("/vehicles", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          year: form.year ? Number(form.year) : undefined,
        }),
      }),
    onSuccess: () => {
      toast.success("Araç eklendi");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    create.mutate();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Araçlar</h1>
          <Input
            className="w-56"
            placeholder="Plaka / marka"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="space-y-2">
          {(vehicles.data?.items ?? []).map((vehicle) => (
            <Link key={vehicle.id} to={`/vehicles/${vehicle.id}`}>
              <Card className="mb-2 flex items-center justify-between p-4 hover:border-brand-500">
                <div>
                  <p className="font-mono text-lg font-semibold">{vehicle.plate}</p>
                  <p className="text-sm text-slate-500">
                    {vehicle.brand} {vehicle.model} · {vehicle.customer.firstName} {vehicle.customer.lastName}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
        <Pager page={page} pageSize={20} total={vehicles.data?.total ?? 0} onPage={setPage} />
      </div>
      <Card className="h-fit space-y-3 p-5">
        <h2 className="font-semibold">Yeni araç</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <select
            className="h-10 w-full rounded-lg border px-3 text-sm"
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
          >
            <option value="">Müşteri seç</option>
            {(customers.data?.items ?? []).map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.firstName} {customer.lastName}
              </option>
            ))}
          </select>
          <Input className="plate-input" placeholder="Plaka" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} />
          <Input placeholder="Marka" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          <Input placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          <Input placeholder="Renk" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          <Input placeholder="Yıl" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
          <Button type="submit" className="w-full">Kaydet</Button>
        </form>
      </Card>
    </div>
  );
}
