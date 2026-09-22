import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { CUSTOMER_JOURNEY_STEPS, normalizePlate } from "@carwash/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, Label, Textarea } from "@/components/ui/forms";
import { formatDateTime, formatMoney } from "@/lib/utils";

type CatalogService = {
  id: string;
  name: string;
  price: number;
  estimatedMinutes: number;
  zoneType: string;
};

type TrackResponse = {
  found: boolean;
  inProgress?: boolean;
  plate: string;
  code?: string;
  status?: string;
  estimatedDeliveryAt?: string | null;
  zoneName?: string | null;
  staffName?: string | null;
  customer?: { firstName: string; lastName: string };
  vehicle?: { brand?: string; model?: string; color?: string };
  steps?: { key: string; label: string; state: "done" | "current" | "upcoming" }[];
  delivered?: boolean;
};

const TIME_SLOTS = Array.from({ length: 19 }, (_, i) => {
  const hour = 9 + Math.floor(i / 2);
  const minute = i % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${minute}`;
});

export function CustomerPortalPage() {
  const queryClient = useQueryClient();
  const [plate, setPlate] = useState("34ABC123");
  const [submittedPlate, setSubmittedPlate] = useState("34ABC123");
  const [booking, setBooking] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    plate: "",
    date: new Date().toISOString().slice(0, 10),
    time: "10:00",
    note: "",
    serviceIds: [] as string[],
  });

  const catalog = useQuery({
    queryKey: ["portal-catalog"],
    queryFn: () => api<{ items: CatalogService[] }>("/portal/catalog"),
  });

  const track = useQuery({
    queryKey: ["portal-track", submittedPlate],
    enabled: submittedPlate.length >= 5,
    queryFn: () =>
      api<TrackResponse>(`/portal/track?plate=${encodeURIComponent(submittedPlate)}`),
  });

  const selectedServices = (catalog.data?.items ?? []).filter((s) =>
    booking.serviceIds.includes(s.id),
  );
  const liveTotal = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);
  const liveMinutes = selectedServices.reduce((sum, s) => sum + s.estimatedMinutes, 0);

  const createAppointment = useMutation({
    mutationFn: () =>
      api("/portal/appointments", {
        method: "POST",
        body: JSON.stringify({
          ...booking,
          plate: normalizePlate(booking.plate),
        }),
      }),
    onSuccess: () => {
      toast.success("Randevu alındı — Randevular sekmesine düştü");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setBooking((current) => ({ ...current, note: "", serviceIds: [] }));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function onTrack(event: FormEvent) {
    event.preventDefault();
    const next = normalizePlate(plate);
    if (next.length < 5) return toast.error("Geçerli bir plaka girin");
    setSubmittedPlate(next);
  }

  function onBook(event: FormEvent) {
    event.preventDefault();
    if (!booking.firstName || !booking.phone || !booking.plate) {
      return toast.error("Ad, telefon ve plaka gerekli");
    }
    if (!booking.serviceIds.length) return toast.error("En az bir hizmet seçin");
    createAppointment.mutate();
  }

  const steps = track.data?.steps ?? CUSTOMER_JOURNEY_STEPS.map((step) => ({
    key: step.key,
    label: step.label,
    state: "upcoming" as const,
  }));

  const etaLabel = useMemo(() => {
    if (!track.data?.estimatedDeliveryAt) return null;
    return formatDateTime(track.data.estimatedDeliveryAt);
  }, [track.data?.estimatedDeliveryAt]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Müşteri deneyimi
        </p>
        <h1 className="mt-1 text-3xl font-semibold">Müşteri Portalı</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Plakanızla aracı canlı takip edin, hizmetleri ve fiyatları görün, online randevu alın.
          Randevular otomatik olarak yönetim panelindeki Randevular listesine düşer.
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="bg-ink-950 px-6 py-5 text-white">
          <h2 className="text-lg font-semibold">Plaka ile canlı takip</h2>
          <p className="text-sm text-white/70">Örnek: 34ABC123</p>
        </div>
        <form onSubmit={onTrack} className="flex flex-col gap-3 p-6 sm:flex-row">
          <Input
            className="plate-input h-14 flex-1 text-center text-2xl font-semibold"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            placeholder="34ABC123"
          />
          <Button type="submit" size="lg">
            Sorgula
          </Button>
        </form>

        {track.data && !track.data.found ? (
          <p className="px-6 pb-6 text-sm text-amber-700">Bu plaka sistemde bulunamadı.</p>
        ) : null}

        {track.data?.found ? (
          <div className="space-y-6 px-6 pb-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-2xl font-semibold">{track.data.plate}</p>
                <p className="text-sm text-slate-500">
                  {track.data.customer?.firstName} {track.data.customer?.lastName}
                  {track.data.vehicle?.brand ? ` · ${track.data.vehicle.brand} ${track.data.vehicle.model ?? ""}` : ""}
                </p>
              </div>
              <div className="text-right">
                {etaLabel ? (
                  <p className="flex items-center gap-2 text-sm font-medium text-brand-700">
                    <Clock className="h-4 w-4" />
                    Tahmini teslim: {etaLabel}
                  </p>
                ) : null}
                {track.data.zoneName ? (
                  <p className="mt-1 flex items-center justify-end gap-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3" />
                    {track.data.zoneName}
                    {track.data.staffName ? ` · ${track.data.staffName}` : ""}
                  </p>
                ) : null}
              </div>
            </div>

            {!track.data.inProgress && !track.data.delivered ? (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Bu plakaya ait aktif iş emri yok. Aşağıdan randevu alabilirsiniz.
              </p>
            ) : null}

            <ol className="grid gap-2 md:grid-cols-7">
              {steps.map((step, index) => (
                <li
                  key={step.key}
                  className={`relative rounded-2xl border px-3 py-4 text-center text-sm ${
                    step.state === "current"
                      ? "border-brand-600 bg-teal-50 shadow-sm"
                      : step.state === "done"
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold">
                    {step.state === "done" ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <p className="font-medium leading-tight">{step.label}</p>
                  {step.state === "current" ? (
                    <Badge className="mt-2" tone="teal">
                      Şu an burada
                    </Badge>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Fiyatlandırma ve süreler</h2>
          <p className="text-sm text-slate-500">İşletmenin güncel hizmet kataloğu.</p>
          <ul className="mt-4 divide-y">
            {(catalog.data?.items ?? []).map((service) => (
              <li key={service.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{service.name}</p>
                  <p className="text-xs text-slate-500">{service.estimatedMinutes} dk tahmini süre</p>
                </div>
                <p className="font-semibold">{formatMoney(service.price)}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-brand-600" />
            Online randevu
          </h2>
          <p className="text-sm text-slate-500">Canlı fiyat, Randevular paneline otomatik düşer.</p>
          <form onSubmit={onBook} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Ad"
                value={booking.firstName}
                onChange={(e) => setBooking({ ...booking, firstName: e.target.value })}
              />
              <Input
                placeholder="Soyad"
                value={booking.lastName}
                onChange={(e) => setBooking({ ...booking, lastName: e.target.value })}
              />
            </div>
            <Input
              placeholder="Telefon"
              value={booking.phone}
              onChange={(e) => setBooking({ ...booking, phone: e.target.value })}
            />
            <Input
              className="plate-input"
              placeholder="Plaka"
              value={booking.plate}
              onChange={(e) => setBooking({ ...booking, plate: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={booking.date}
                onChange={(e) => setBooking({ ...booking, date: e.target.value })}
              />
              <select
                className="h-10 rounded-lg border px-3 text-sm"
                value={booking.time}
                onChange={(e) => setBooking({ ...booking, time: e.target.value })}
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Hizmetler</Label>
              {(catalog.data?.items ?? []).map((service) => {
                const checked = booking.serviceIds.includes(service.id);
                return (
                  <label key={service.id} className="flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-sm">
                    <span>
                      {service.name}
                      <span className="ml-2 text-xs text-slate-400">{service.estimatedMinutes} dk</span>
                    </span>
                    <span className="flex items-center gap-3">
                      {formatMoney(service.price)}
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setBooking((current) => ({
                            ...current,
                            serviceIds: checked
                              ? current.serviceIds.filter((id) => id !== service.id)
                              : [...current.serviceIds, service.id],
                          }))
                        }
                      />
                    </span>
                  </label>
                );
              })}
            </div>
            <Textarea
              placeholder="Not (opsiyonel)"
              value={booking.note}
              onChange={(e) => setBooking({ ...booking, note: e.target.value })}
            />
            <div className="rounded-xl bg-foam-100 px-4 py-3 text-sm">
              <p>
                Toplam: <strong>{formatMoney(liveTotal)}</strong>
              </p>
              <p className="text-slate-500">Tahmini süre: {liveMinutes || 0} dk</p>
            </div>
            <Button type="submit" className="w-full" disabled={createAppointment.isPending}>
              {createAppointment.isPending ? "Kaydediliyor..." : "Randevu oluştur"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
