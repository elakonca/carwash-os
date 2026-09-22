import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  WORK_ORDER_STATUS_LABELS,
  ZONE_TYPE_LABELS,
  type WorkOrderStatus,
} from "@carwash/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Badge, Card } from "@/components/ui/forms";
import { formatMoney } from "@/lib/utils";

type Board = {
  columns: Record<string, WorkOrderCard[]>;
  zones: Zone[];
  staff: { id: string; name: string; specialty?: string; activeWorkOrders: WorkOrderCard[] }[];
};

type WorkOrderCard = {
  id: string;
  code: string;
  status: WorkOrderStatus;
  totalAmount?: number;
  vehicle: { plate: string; brand?: string; model?: string };
  customer: { firstName: string; lastName: string };
  currentZone?: { name: string } | null;
  assignedStaff?: { name: string } | null;
};

type Zone = {
  id: string;
  name: string;
  type: keyof typeof ZONE_TYPE_LABELS;
  status: "EMPTY" | "OCCUPIED" | "OUT_OF_SERVICE";
  currentWorkOrder?: { vehicle: { plate: string } } | null;
};

const COLUMN_ORDER: WorkOrderStatus[] = [
  "ACCEPTED",
  "PARKED",
  "EXTERIOR_WASH",
  "INTERIOR_WASH",
  "DRYING",
  "DETAILING",
  "QUALITY_CHECK",
  "READY",
];

export function DashboardPage() {
  const { canSeeReports } = useAuth();
  const board = useQuery({
    queryKey: ["board"],
    queryFn: () => api<Board>("/dashboard/board"),
    refetchInterval: 5000,
  });
  const summary = useQuery({
    queryKey: ["summary"],
    queryFn: () =>
      api<{
        vehiclesInProgress: number;
        readyCount: number;
        unpaidCount: number;
        todayRevenue?: number;
        zoneOccupancy: { occupied: number; total: number };
      }>("/dashboard/summary"),
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Canlı operasyon</h1>
          <p className="text-sm text-slate-500">Alanlar, iş emirleri ve personel aynı anda.</p>
        </div>
        <Link
          to="/accept"
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white"
        >
          30 sn kabul
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Sahadaki araç" value={summary.data?.vehiclesInProgress ?? "—"} />
        <Stat label="Teslime hazır" value={summary.data?.readyCount ?? "—"} />
        <Stat
          label="Alan doluluk"
          value={
            summary.data
              ? `${summary.data.zoneOccupancy.occupied}/${summary.data.zoneOccupancy.total}`
              : "—"
          }
        />
        {canSeeReports ? (
          <Stat label="Günlük ciro" value={formatMoney(summary.data?.todayRevenue ?? 0)} />
        ) : (
          <Stat label="Ödenmemiş" value={summary.data?.unpaidCount ?? "—"} />
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {COLUMN_ORDER.map((status) => (
          <div key={status} className="w-64 shrink-0">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{WORK_ORDER_STATUS_LABELS[status]}</h2>
              <span className="text-xs text-slate-400">
                {board.data?.columns[status]?.length ?? 0}
              </span>
            </div>
            <div className="space-y-2">
              {(board.data?.columns[status] ?? []).map((wo) => (
                <Link key={wo.id} to={`/work-orders/${wo.id}`}>
                  <Card className="p-3 hover:border-brand-500">
                    <p className="font-mono text-sm font-semibold">{wo.vehicle.plate}</p>
                    <p className="text-xs text-slate-500">
                      {wo.customer.firstName} {wo.customer.lastName}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {wo.currentZone ? <Badge>{wo.currentZone.name}</Badge> : null}
                      {wo.assignedStaff ? <Badge tone="teal">{wo.assignedStaff.name}</Badge> : null}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold">Alan dolulukları</h3>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
            {(board.data?.zones ?? []).map((zone) => (
              <div
                key={zone.id}
                className={`rounded-xl border p-3 text-sm ${
                  zone.status === "OCCUPIED"
                    ? "border-amber-200 bg-amber-50"
                    : zone.status === "OUT_OF_SERVICE"
                      ? "border-slate-200 bg-slate-50 text-slate-400"
                      : "border-emerald-200 bg-emerald-50"
                }`}
              >
                <p className="font-medium">{zone.name}</p>
                <p className="text-xs">{ZONE_TYPE_LABELS[zone.type]}</p>
                <p className="mt-1 font-mono text-xs">
                  {zone.currentWorkOrder?.vehicle.plate ?? "BOŞ"}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold">Kim hangi araçta</h3>
          <div className="mt-4 space-y-3">
            {(board.data?.staff ?? []).map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-xl bg-foam-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-slate-500">{member.specialty}</p>
                </div>
                <div className="text-right text-sm">
                  {member.activeWorkOrders.length ? (
                    member.activeWorkOrders.map((wo) => (
                      <Link key={wo.id} className="block font-mono" to={`/work-orders/${wo.id}`}>
                        {wo.vehicle.plate}
                      </Link>
                    ))
                  ) : (
                    <span className="text-slate-400">Boşta</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Card>
  );
}
