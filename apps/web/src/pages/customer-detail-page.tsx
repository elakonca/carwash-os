import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/forms";
import { formatMoney } from "@/lib/utils";

export function CustomerDetailPage() {
  const { id } = useParams();
  const { canSeePrices } = useAuth();
  const summary = useQuery({
    queryKey: ["customer-summary", id],
    queryFn: () =>
      api<{
        customer: { firstName: string; lastName: string; phone: string; email?: string | null; note?: string | null };
        vehicles: { id: string; plate: string; brand?: string; model?: string }[];
        recentWorkOrders: { id: string; code: string; status: string; totalAmount?: number }[];
        visitCount: number;
        totalSpent?: number;
      }>(`/customers/${id}/summary`),
  });

  if (!summary.data) return <p>Yükleniyor...</p>;
  const data = summary.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {data.customer.firstName} {data.customer.lastName}
        </h1>
        <p className="text-slate-500">{data.customer.phone}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-slate-500">Ziyaret</p>
          <p className="text-2xl font-semibold">{data.visitCount}</p>
        </Card>
        {canSeePrices ? (
          <Card className="p-4">
            <p className="text-xs text-slate-500">Toplam harcama</p>
            <p className="text-2xl font-semibold">{formatMoney(data.totalSpent)}</p>
          </Card>
        ) : null}
      </div>
      <Card className="p-5">
        <h3 className="font-semibold">Araçlar</h3>
        <ul className="mt-3 space-y-2">
          {data.vehicles.map((vehicle) => (
            <li key={vehicle.id} className="font-mono">
              {vehicle.plate} <span className="text-slate-500">{vehicle.brand} {vehicle.model}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-5">
        <h3 className="font-semibold">Son iş emirleri</h3>
        <ul className="mt-3 space-y-2">
          {data.recentWorkOrders.map((wo) => (
            <li key={wo.id}>
              <Link to={`/work-orders/${wo.id}`} className="flex justify-between text-sm">
                <span>{wo.code} · {wo.status}</span>
                {canSeePrices ? <span>{formatMoney(wo.totalAmount)}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
