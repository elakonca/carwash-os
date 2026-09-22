import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/forms";
import { WORK_ORDER_STATUS_LABELS, type WorkOrderStatus } from "@carwash/shared";

export function VehicleHistoryPage() {
  const { id } = useParams();
  const history = useQuery({
    queryKey: ["vehicle-history", id],
    queryFn: () =>
      api<{
        vehicle: { plate: string; brand?: string; model?: string; customer: { firstName: string; lastName: string } };
        workOrders: { id: string; code: string; status: WorkOrderStatus; acceptedAt: string }[];
      }>(`/vehicles/${id}/history`),
  });

  if (!history.data) return <p>Yükleniyor...</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-mono text-2xl font-semibold">{history.data.vehicle.plate}</h1>
        <p className="text-slate-500">
          {history.data.vehicle.brand} {history.data.vehicle.model} · {history.data.vehicle.customer.firstName}{" "}
          {history.data.vehicle.customer.lastName}
        </p>
      </div>
      {(history.data.workOrders ?? []).map((wo) => (
        <Link key={wo.id} to={`/work-orders/${wo.id}`}>
          <Card className="mb-2 flex justify-between p-4">
            <span>{wo.code}</span>
            <span>{WORK_ORDER_STATUS_LABELS[wo.status]}</span>
          </Card>
        </Link>
      ))}
    </div>
  );
}
