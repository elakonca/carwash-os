import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ZONE_TYPE_LABELS, ZONE_TYPES } from "@carwash/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, Input } from "@/components/ui/forms";
import { Pager } from "@/components/ui/pager";
import { withQuery, type Page } from "@/lib/paging";
import { formatMoney } from "@/lib/utils";

type Service = {
  id: string;
  name: string;
  estimatedMinutes: number;
  zoneType: (typeof ZONE_TYPES)[number];
  price?: number | string;
  isActive: boolean;
};

export function ServicesPage() {
  const { canSeePrices, user } = useAuth();
  const canManage = user?.role !== "STAFF";
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    price: "",
    estimatedMinutes: "20",
    zoneType: "EXTERIOR" as (typeof ZONE_TYPES)[number],
  });

  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ["services", page],
    queryFn: () => api<Page<Service>>(withQuery("/services", { page, pageSize: 20 })),
  });

  const create = useMutation({
    mutationFn: () =>
      api("/services", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          price: form.price,
          estimatedMinutes: Number(form.estimatedMinutes),
        }),
      }),
    onSuccess: () => {
      toast.success("Hizmet eklendi");
      queryClient.invalidateQueries({ queryKey: ["services"] });
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
        <h1 className="mb-4 text-2xl font-semibold">Hizmetler</h1>
        <div className="space-y-2">
          {(list.data?.items ?? []).map((service) => (
            <Card key={service.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{service.name}</p>
                <p className="text-sm text-slate-500">
                  {service.estimatedMinutes} dk · {ZONE_TYPE_LABELS[service.zoneType]}
                </p>
              </div>
              {canSeePrices && service.price !== undefined ? (
                <p className="font-semibold">{formatMoney(service.price)}</p>
              ) : null}
            </Card>
          ))}
        </div>
        <Pager page={page} pageSize={20} total={list.data?.total ?? 0} onPage={setPage} />
      </div>
      {canManage ? (
        <Card className="h-fit space-y-3 p-5">
          <h2 className="font-semibold">Yeni hizmet</h2>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input placeholder="Ad" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Fiyat" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <Input placeholder="Süre (dk)" value={form.estimatedMinutes} onChange={(e) => setForm({ ...form, estimatedMinutes: e.target.value })} />
            <select
              className="h-10 w-full rounded-lg border px-3 text-sm"
              value={form.zoneType}
              onChange={(e) => setForm({ ...form, zoneType: e.target.value as (typeof ZONE_TYPES)[number] })}
            >
              {ZONE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ZONE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <Button type="submit" className="w-full">Kaydet</Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
