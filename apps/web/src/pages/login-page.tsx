import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/forms";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("owner@aquashine.com");
  const [password, setPassword] = useState("Owner123!");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-ink-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <p className="text-sm tracking-[0.3em] text-brand-400">CAR WASH OS</p>
        <div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight">
            Oto yıkama operasyonunu tek ekranda yönetin.
          </h1>
          <p className="mt-4 max-w-md text-white/70">
            Kabul, alan doluluğu, personel ve teslim — durum makinesi ile tutarlı.
          </p>
          <p className="mt-4 inline-flex rounded-full bg-brand-500/20 px-3 py-1 text-xs text-brand-400">
            Demo modu · bellek içi veri, Docker/Postgres yok
          </p>
        </div>
        <p className="text-sm text-white/40">Faz 1 · ERP / CRM</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col justify-center px-8 py-12 lg:px-24">
        <h2 className="text-2xl font-semibold">Giriş yap</h2>
        <p className="mt-1 text-sm text-slate-500">
          Veritabanı gerekmez. Demo: owner@aquashine.com / Owner123!
        </p>
        <div className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-posta</Label>
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Giriş yapılıyor..." : "Devam et"}
          </Button>
        </div>
      </form>
    </div>
  );
}
