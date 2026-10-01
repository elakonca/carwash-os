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

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  vehicles: { id: string; plate: string }[];
};

export function CustomersPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQ = useDebouncedValue(q, 300);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "" });
  const list = useQuery({
    queryKey: ["customers", debouncedQ, page],
    queryFn: () =>
      api<Page<Customer>>(withQuery("/customers", { q: debouncedQ, page, pageSize: 20 })),
  });

  const create = useMutation({
    mutationFn: () =>
      api("/customers", {
        method: "POST",
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      toast.success("Müşteri eklendi");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setForm({ firstName: "", lastName: "", phone: "", email: "" });
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Müşteriler</h1>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Ara"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="w-56"
            />
            <Link
              to="/accept"
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white"
            >
              Araç kabul
            </Link>
          </div>
        </div>
        <div className="space-y-2">
          {(list.data?.items ?? []).map((customer) => (
            <Link key={customer.id} to={`/customers/${customer.id}`}>
              <Card className="mb-2 flex items-center justify-between p-4 hover:border-brand-500">
                <div>
                  <p className="font-medium">
                    {customer.firstName} {customer.lastName}
                  </p>
                  <p className="text-sm text-slate-500">{customer.phone}</p>
                </div>
                <p className="font-mono text-sm">
                  {customer.vehicles.map((v) => v.plate).join(" · ") || "Araç yok"}
                </p>
              </Card>
            </Link>
          ))}
        </div>
        <Pager page={page} pageSize={20} total={list.data?.total ?? 0} onPage={setPage} />
      </div>
      <Card className="h-fit space-y-3 p-5">
        <h2 className="font-semibold">Yeni müşteri</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <Input placeholder="Ad" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <Input placeholder="Soyad" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          <Input placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input placeholder="E-posta" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Button type="submit" className="w-full">Kaydet</Button>
        </form>
      </Card>
    </div>
  );
}
