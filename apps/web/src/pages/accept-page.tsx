import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DAMAGE_TYPE_LABELS,
  DAMAGE_TYPES,
  PHOTO_CATEGORIES,
  PHOTO_CATEGORY_LABELS,
  normalizePlate,
  type PhotoCategory,
} from "@carwash/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, Label, Textarea } from "@/components/ui/forms";
import { compressImage, formatMoney } from "@/lib/utils";

type VehicleMatch = {
  id: string;
  plate: string;
  brand?: string;
  model?: string;
  color?: string;
  year?: number;
  customer: { id: string; firstName: string; lastName: string; phone: string };
};

type Service = {
  id: string;
  name: string;
  estimatedMinutes: number;
  price?: number;
  zoneType: string;
};

export function AcceptPage() {
  const { canSeePrices } = useAuth();
  const navigate = useNavigate();
  const [plate, setPlate] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<Partial<Record<PhotoCategory, File>>>({});
  const [damageArea, setDamageArea] = useState("");
  const [damageType, setDamageType] = useState<(typeof DAMAGE_TYPES)[number]>("SCRATCH");
  const [damageNote, setDamageNote] = useState("");
  const [customer, setCustomer] = useState({ firstName: "", lastName: "", phone: "" });
  const [vehicle, setVehicle] = useState({ brand: "", model: "", color: "", year: "" });

  const normalized = useMemo(() => (plate ? normalizePlate(plate) : ""), [plate]);

  const matchQuery = useQuery({
    queryKey: ["vehicle-plate", normalized],
    enabled: normalized.length >= 5,
    queryFn: () => api<{ items: VehicleMatch[] }>(`/vehicles?plate=${normalized}`),
  });
  const match = matchQuery.data?.items[0];

  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: () => api<{ items: Service[] }>("/services"),
  });

  const zonesQuery = useQuery({
    queryKey: ["zones"],
    queryFn: () =>
      api<{ items: { id: string; name: string; type: string; status: string }[] }>("/zones"),
  });

  const suggestedZones = useMemo(() => {
    const empty = (zonesQuery.data?.items ?? []).filter((zone) => zone.status === "EMPTY");
    const wanted = new Set(
      (servicesQuery.data?.items ?? [])
        .filter((service) => serviceIds.includes(service.id))
        .map((service) => service.zoneType),
    );
    wanted.add("PARK");
    const matched = empty.filter((zone) => wanted.has(zone.type));
    return (matched.length ? matched : empty).slice(0, 3);
  }, [zonesQuery.data, servicesQuery.data, serviceIds]);

  const accept = useMutation({
    mutationFn: async () => {
      const payload = match
        ? {
            source: "staff" as const,
            vehicleId: match.id,
            customerId: match.customer.id,
            serviceIds,
            note,
          }
        : {
            source: "staff" as const,
            plate: normalized,
            customer: {
              firstName: customer.firstName,
              lastName: customer.lastName,
              phone: customer.phone,
            },
            vehicle: {
              plate: normalized,
              brand: vehicle.brand || undefined,
              model: vehicle.model || undefined,
              color: vehicle.color || undefined,
              year: vehicle.year ? Number(vehicle.year) : undefined,
            },
            serviceIds,
            note,
          };

      const created = await api<{ id: string }>("/work-orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      for (const [category, file] of Object.entries(photos)) {
        if (!file) continue;
        const compressed = await compressImage(file);
        const form = new FormData();
        form.append("file", compressed);
        form.append("category", category);
        await api(`/work-orders/${created.id}/photos`, { method: "POST", body: form });
      }

      if (damageArea) {
        await api(`/work-orders/${created.id}/damages`, {
          method: "POST",
          body: JSON.stringify({ area: damageArea, type: damageType, note: damageNote }),
        });
      }

      return created;
    },
    onSuccess: (created) => {
      toast.success("İş emri oluşturuldu");
      navigate(`/work-orders/${created.id}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!normalized) return toast.error("Plaka gerekli");
    if (!serviceIds.length) return toast.error("En az bir hizmet seçin");
    if (!match && (!customer.firstName || !customer.phone)) {
      return toast.error("Yeni araç için müşteri bilgisi gerekli");
    }
    accept.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hızlı araç kabulü</h1>
        <p className="text-sm text-slate-500">Plaka ile bulun, hizmet seçin, 30 saniyede kabul edin.</p>
      </div>

      <Card className="p-6">
        <Label>Plaka</Label>
        <Input
          className="plate-input mt-2 h-16 text-center text-3xl font-semibold"
          placeholder="34ABC123"
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
        />
        {match ? (
          <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm">
            <p className="font-medium">
              {match.customer.firstName} {match.customer.lastName} · {match.customer.phone}
            </p>
            <p className="text-slate-600">
              {match.brand} {match.model} {match.color}
            </p>
          </div>
        ) : normalized.length >= 5 ? (
          <p className="mt-3 text-sm text-amber-700">Kayıt bulunamadı — yeni müşteri/araç formu açıldı.</p>
        ) : null}
        {suggestedZones.length ? (
          <div className="mt-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-900">
            <p className="font-medium">Boş alan önerisi</p>
            <p>{suggestedZones.map((zone) => `${zone.name} (${zone.type})`).join(" · ")}</p>
          </div>
        ) : null}
      </Card>

      {!match && normalized.length >= 5 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="space-y-3 p-5">
            <h3 className="font-semibold">Müşteri</h3>
            <Input placeholder="Ad" value={customer.firstName} onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })} />
            <Input placeholder="Soyad" value={customer.lastName} onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })} />
            <Input placeholder="Telefon" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
          </Card>
          <Card className="space-y-3 p-5">
            <h3 className="font-semibold">Araç</h3>
            <Input placeholder="Marka" value={vehicle.brand} onChange={(e) => setVehicle({ ...vehicle, brand: e.target.value })} />
            <Input placeholder="Model" value={vehicle.model} onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Renk" value={vehicle.color} onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })} />
              <Input placeholder="Yıl" value={vehicle.year} onChange={(e) => setVehicle({ ...vehicle, year: e.target.value })} />
            </div>
          </Card>
        </div>
      ) : null}

      <Card className="p-5">
        <h3 className="font-semibold">Hizmetler</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {(servicesQuery.data?.items ?? []).map((service) => {
            const checked = serviceIds.includes(service.id);
            return (
              <label
                key={service.id}
                className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 ${
                  checked ? "border-brand-600 bg-teal-50" : "border-slate-200"
                }`}
              >
                <div>
                  <p className="font-medium">{service.name}</p>
                  <p className="text-xs text-slate-500">{service.estimatedMinutes} dk</p>
                </div>
                <div className="flex items-center gap-3">
                  {canSeePrices && service.price !== undefined ? (
                    <span className="text-sm">{formatMoney(service.price)}</span>
                  ) : null}
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setServiceIds((ids) =>
                        checked ? ids.filter((id) => id !== service.id) : [...ids, service.id],
                      )
                    }
                  />
                </div>
              </label>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold">Kabul fotoğrafları</h3>
          <p className="text-xs text-slate-500">Yüklemeden önce tarayıcıda sıkıştırılır.</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {PHOTO_CATEGORIES.filter((c) => c !== "DELIVERY").map((category) => (
              <label key={category} className="rounded-xl border border-dashed p-3 text-sm">
                <p className="mb-2 font-medium">{PHOTO_CATEGORY_LABELS[category]}</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setPhotos((current) => ({ ...current, [category]: file }));
                  }}
                />
                {photos[category] ? <Badge className="mt-2" tone="teal">Seçildi</Badge> : null}
              </label>
            ))}
          </div>
        </Card>
        <Card className="space-y-3 p-5">
          <h3 className="font-semibold">Hasar kaydı (opsiyonel)</h3>
          <Input placeholder="Bölge (ör. ön tampon)" value={damageArea} onChange={(e) => setDamageArea(e.target.value)} />
          <select
            className="h-10 w-full rounded-lg border px-3 text-sm"
            value={damageType}
            onChange={(e) => setDamageType(e.target.value as (typeof DAMAGE_TYPES)[number])}
          >
            {DAMAGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {DAMAGE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <Textarea placeholder="Not" value={damageNote} onChange={(e) => setDamageNote(e.target.value)} />
        </Card>
      </div>

      <div className="space-y-2">
        <Label>Not</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <Button type="submit" size="lg" disabled={accept.isPending}>
        {accept.isPending ? "Oluşturuluyor..." : "Kabul et ve iş emri aç"}
      </Button>
    </form>
  );
}

export default AcceptPage;
