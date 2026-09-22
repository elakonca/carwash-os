import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  DAMAGE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PHOTO_CATEGORY_LABELS,
  WORK_ORDER_STATUS_LABELS,
  getNextStatuses,
  isZoneRequired,
  type PaymentMethod,
  type WorkOrderStatus,
} from "@carwash/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge, Card, Textarea } from "@/components/ui/forms";
import { formatDateTime, formatMoney } from "@/lib/utils";

type WorkOrder = {
  id: string;
  code: string;
  status: WorkOrderStatus;
  note?: string;
  totalAmount?: number;
  paymentStatus: "UNPAID" | "PAID";
  paymentMethod?: PaymentMethod | null;
  cancelledReason?: string | null;
  estimatedDeliveryAt?: string;
  vehicle: { plate: string; brand?: string; model?: string };
  customer: { firstName: string; lastName: string; phone: string };
  currentZone?: { id: string; name: string } | null;
  assignedStaff?: { id: string; name: string } | null;
  services: { id: string; nameSnapshot: string; priceSnapshot?: number; estimatedMinutesSnapshot: number }[];
  photos: { id: string; category: keyof typeof PHOTO_CATEGORY_LABELS; fileUrl: string }[];
  damages: { id: string; area: string; type: keyof typeof DAMAGE_TYPE_LABELS; note?: string }[];
  statusLogs: {
    id: string;
    fromStatus: WorkOrderStatus | null;
    toStatus: WorkOrderStatus;
    createdAt: string;
    user: { name: string };
    zone?: { name: string } | null;
    staff?: { name: string } | null;
  }[];
};

export function WorkOrderPage() {
  const { id } = useParams();
  const { canSeePrices } = useAuth();
  const queryClient = useQueryClient();
  const [toStatus, setToStatus] = useState<WorkOrderStatus | "">("");
  const [zoneId, setZoneId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");

  const wo = useQuery({
    queryKey: ["work-order", id],
    queryFn: () => api<WorkOrder>(`/work-orders/${id}`),
    enabled: Boolean(id),
  });
  const zones = useQuery({
    queryKey: ["zones"],
    queryFn: () => api<{ items: { id: string; name: string; type: string; status: string }[] }>("/zones"),
  });
  const staff = useQuery({
    queryKey: ["staff"],
    queryFn: () => api<{ items: { id: string; name: string }[] }>("/staff"),
  });

  const next = useMemo(
    () => (wo.data ? getNextStatuses(wo.data.status) : []),
    [wo.data],
  );

  const transition = useMutation({
    mutationFn: () =>
      api(`/work-orders/${id}/transition`, {
        method: "POST",
        body: JSON.stringify({
          toStatus: toStatus || next[0],
          zoneId: zoneId || null,
          staffId: staffId || undefined,
        }),
      }),
    onSuccess: () => {
      toast.success("Durum güncellendi");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const assign = useMutation({
    mutationFn: () =>
      api(`/work-orders/${id}/assign-staff`, {
        method: "POST",
        body: JSON.stringify({ staffId: staffId || null }),
      }),
    onSuccess: () => {
      toast.success("Personel atandı");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pay = useMutation({
    mutationFn: () =>
      api(`/work-orders/${id}/payment`, {
        method: "POST",
        body: JSON.stringify({ method, status: "PAID" }),
      }),
    onSuccess: () => {
      toast.success("Ödeme kaydedildi");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cancel = useMutation({
    mutationFn: () =>
      api(`/work-orders/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      toast.success("İş emri iptal edildi");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!wo.data) return <p>Yükleniyor...</p>;
  const order = wo.data;
  const selectedStatus = (toStatus || next[0]) as WorkOrderStatus | undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-slate-500">{order.code}</p>
          <h1 className="text-2xl font-semibold">{order.vehicle.plate}</h1>
          <p className="text-sm text-slate-500">
            {order.customer.firstName} {order.customer.lastName} · {order.customer.phone}
          </p>
        </div>
        <Badge tone="teal">{WORK_ORDER_STATUS_LABELS[order.status]}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-3 p-5 lg:col-span-2">
          <h3 className="font-semibold">Aşama geçişi</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <select
              className="h-10 rounded-lg border px-3 text-sm"
              value={toStatus || next[0] || ""}
              onChange={(e) => setToStatus(e.target.value as WorkOrderStatus)}
            >
              {next.map((status) => (
                <option key={status} value={status}>
                  {WORK_ORDER_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-lg border px-3 text-sm"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
            >
              <option value="">Alan seç</option>
              {(zones.data?.items ?? []).map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} ({zone.status})
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-lg border px-3 text-sm"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
            >
              <option value="">Personel</option>
              {(staff.data?.items ?? []).map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
          {selectedStatus && isZoneRequired(selectedStatus) ? (
            <p className="text-xs text-amber-700">Bu aşama için alan seçimi zorunlu.</p>
          ) : null}
          <div className="flex gap-2">
            <Button onClick={() => transition.mutate()} disabled={!next.length}>
              İlerlet / taşı
            </Button>
            <Button variant="outline" onClick={() => assign.mutate()}>
              Personel ata
            </Button>
          </div>
        </Card>

        <Card className="space-y-3 p-5">
          <h3 className="font-semibold">Ödeme</h3>
          {canSeePrices ? <p className="text-2xl font-semibold">{formatMoney(order.totalAmount)}</p> : null}
          <p className="text-sm">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</p>
          <select
            className="h-10 w-full rounded-lg border px-3 text-sm"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          >
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button onClick={() => pay.mutate()} disabled={order.paymentStatus === "PAID"}>
            Ödendi işaretle
          </Button>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold">Hizmetler</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {order.services.map((service) => (
              <li key={service.id} className="flex justify-between">
                <span>
                  {service.nameSnapshot} · {service.estimatedMinutesSnapshot} dk
                </span>
                {canSeePrices && service.priceSnapshot !== undefined
                  ? formatMoney(service.priceSnapshot)
                  : null}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold">Durum geçmişi</h3>
          <ol className="mt-3 space-y-2 text-sm">
            {order.statusLogs.map((log) => (
              <li key={log.id} className="rounded-lg bg-foam-50 px-3 py-2">
                {log.fromStatus ? WORK_ORDER_STATUS_LABELS[log.fromStatus] : "—"} →{" "}
                {WORK_ORDER_STATUS_LABELS[log.toStatus]}
                <div className="text-xs text-slate-500">
                  {log.user.name}
                  {log.zone ? ` · ${log.zone.name}` : ""}
                  {log.staff ? ` · ${log.staff.name}` : ""} · {formatDateTime(log.createdAt)}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold">Fotoğraflar</h3>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {order.photos.map((photo) => (
              <a key={photo.id} href={photo.fileUrl} target="_blank" rel="noreferrer">
                <img src={photo.fileUrl} alt={photo.category} className="h-24 w-full rounded-lg object-cover" />
                <p className="mt-1 text-xs">{PHOTO_CATEGORY_LABELS[photo.category]}</p>
              </a>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold">Hasarlar</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {order.damages.map((damage) => (
              <li key={damage.id}>
                {damage.area} · {DAMAGE_TYPE_LABELS[damage.type]} {damage.note ? `— ${damage.note}` : ""}
              </li>
            ))}
            {!order.damages.length ? <li className="text-slate-400">Kayıt yok</li> : null}
          </ul>
        </Card>
      </div>

      {next.includes("CANCELLED") || order.status !== "CANCELLED" ? (
        <Card className="space-y-3 p-5">
          <h3 className="font-semibold">İptal</h3>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="İptal nedeni" />
          <Button variant="danger" onClick={() => cancel.mutate()} disabled={!reason}>
            İptal et
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
