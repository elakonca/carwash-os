# Car Wash OS

Oto yıkama operasyonları, randevular ve müşteri portalı için monorepo. API Express + Prisma, arayüz React + Vite.

## Gereksinimler

- Node.js 22
- pnpm 9
- PostgreSQL 16
- Redis (login ve API hız sınırları için; yoksa bellek içi sınır kullanılır)

## Kurulum

```bash
pnpm install
cp .env.example .env
pnpm --filter api prisma migrate dev
pnpm --filter api db:seed
pnpm dev
```

`pnpm dev` API'yi `http://localhost:3001` ve arayüzü `http://localhost:5173` adresinde açar. Arayüz `/api` isteklerini API'ye proxy'ler.

`pnpm build` paylaşılan paketi, API'yi ve web derlemesini sırayla üretir.

`pnpm test` auth, durum makinesi, alan kilidi ve tenant izolasyonu testlerini çalıştırır. Testler `DATABASE_URL` üzerindeki PostgreSQL'e bağlanır.

## Yerel hesaplar

Seed sonrası giriş:

| Rol | E-posta | Şifre |
| --- | --- | --- |
| Owner | owner@aquashine.com | Owner123! |
| Manager | manager@aquashine.com | Manager123! |
| Staff | staff@aquashine.com | Staff123! |

Oturum açma refresh token'ı yalnızca `httpOnly` cookie'de tutulur. Access token tarayıcı belleğinde (`localStorage`) kalır.

## Docker

API, web, PostgreSQL ve Redis tek komutla ayağa kalkar:

```bash
docker compose up --build
```

Arayüz `http://localhost:8080`, API `http://localhost:3001`. Yerel HTTP için compose `COOKIE_SECURE=false` kullanır. TLS arkasındaki production ortamında `COOKIE_SECURE=true` bırakın (`NODE_ENV=production` bunu varsayılan yapar).

## Ortam değişkenleri

`.env.example` dosyasına bakın. `VITE_DEMO_MODE` varsayılan olarak kapalıdır; sahte API yalnızca `VITE_DEMO_MODE=true` ile açılır.
