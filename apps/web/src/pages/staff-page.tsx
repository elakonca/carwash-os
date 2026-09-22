import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, Input } from "@/components/ui/forms";

type Staff = {
  id: string;
  name: string;
  phone?: string | null;
  specialty?: string | null;
  workOrders: { id: string; vehicle: { plate: string } }[];
};

export function StaffPage() {
  const { user } = useAuth();
  const canManage = user?.role !== "STAFF";
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", specialty: "" });

  const list = useQuery({
    queryKey: ["staff"],
    queryFn: () => api<{ items: Staff[] }>("/staff"),
  });

  const create = useMutation({
    mutationFn: () => api("/staff", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      toast.success("Personel eklendi");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
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
        <h1 className="mb-4 text-2xl font-semibold">Personel</h1>
        <div className="space-y-2">
          {(list.data?.items ?? []).map((member) => (
            <Card key={member.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-slate-500">{member.specialty}</p>
              </div>
              <div className="text-right font-mono text-sm">
                {member.workOrders.length
                  ? member.workOrders.map((wo) => (
                      <Link key={wo.id} className="block" to={`/work-orders/${wo.id}`}>
                        {wo.vehicle.plate}
                      </Link>
                    ))
                  : "Boşta"}
              </div>
            </Card>
          ))}
        </div>
      </div>
      {canManage ? (
        <Card className="h-fit space-y-3 p-5">
          <h2 className="font-semibold">Yeni personel</h2>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input placeholder="Ad" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Uzmanlık" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
            <Button type="submit" className="w-full">Kaydet</Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
