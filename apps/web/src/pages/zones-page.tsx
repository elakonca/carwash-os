import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ZONE_STATUSES, ZONE_TYPE_LABELS, ZONE_TYPES } from "@carwash/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, Input } from "@/components/ui/forms";
import { Pager } from "@/components/ui/pager";
import { withQuery, type Page } from "@/lib/paging";

type Zone = {
  id: string;
  name: string;
  type: (typeof ZONE_TYPES)[number];
  status: (typeof ZONE_STATUSES)[number];
  currentWorkOrder?: { vehicle: { plate: string } } | null;
};

export function ZonesPage() {
  const { user } = useAuth();
  const canManage = user?.role !== "STAFF";
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", type: "PARK" as (typeof ZONE_TYPES)[number] });

  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ["zones", page],
    queryFn: () => api<Page<Zone>>(withQuery("/zones", { page, pageSize: 20 })),
  });

  const create = useMutation({
    mutationFn: () => api("/zones", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      toast.success("Alan eklendi");
      queryClient.invalidateQueries({ queryKey: ["zones"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Zone["status"] }) =>
      api(`/zones/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["zones"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    create.mutate();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Alanlar</h1>
      <div className="grid gap-3 md:grid-cols-3">
        {(list.data?.items ?? []).map((zone) => (
          <Card key={zone.id} className="p-4">
            <p className="font-medium">{zone.name}</p>
            <p className="text-sm text-slate-500">{ZONE_TYPE_LABELS[zone.type]}</p>
            <p className="mt-2 font-mono text-sm">{zone.currentWorkOrder?.vehicle.plate ?? "BOŞ"}</p>
            {canManage ? (
              <select
                className="mt-3 h-9 w-full rounded-lg border px-2 text-sm"
                value={zone.status}
                onChange={(e) =>
                  update.mutate({ id: zone.id, status: e.target.value as Zone["status"] })
                }
              >
                {ZONE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-2 text-xs">{zone.status}</p>
            )}
          </Card>
        ))}
      </div>
      <Pager page={page} pageSize={20} total={list.data?.total ?? 0} onPage={setPage} />
      {canManage ? (
        <Card className="max-w-md space-y-3 p-5">
          <h2 className="font-semibold">Yeni alan</h2>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input placeholder="Ad" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select
              className="h-10 w-full rounded-lg border px-3 text-sm"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as (typeof ZONE_TYPES)[number] })}
            >
              {ZONE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ZONE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <Button type="submit">Kaydet</Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
