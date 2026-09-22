# 🚗 Car Wash OS - Oto Yıkama ERP/CRM & Müşteri Portalı

Car Wash OS, oto yıkama ve araç bakım merkezlerinin günlük operasyonlarını, randevularını ve müşteri süreçlerini yönetmek için geliştirilmiş modern bir web tabanlı ERP/CRM sistemidir.

## 🌟 Öne Çıkan Özellikler

- **İşletme Yönetim Paneli:** Canlı Kanban operasyon panosu, alan doluluk takibi (Park/Yıkama/Detailing), personel atama ve iş emri geçişleri.
- **Hızlı Araç Kabul:** 30 saniyenin altında plaka sorgulama, hizmet/paket seçimi ve fotoğraf/hasar kayıt modülü.
- **Müşteri Portalı:** Plaka ile canlı araç durum takibi, online randevu alma ve güncel hizmet kataloğu/fiyatlandırma.
- **API-First Mimari:** İleride mobil uygulama ve Kamera/AI (ANPR) entegrasyonuna tam uyumlu yapı.

## 🛠 Kullanılan Teknolojiler

- **Frontend:** React (Vite), TypeScript, Tailwind CSS, Shadcn UI
- **Backend / ORM:** Prisma ORM
- **State & Routing:** Lucide Icons, React Router

---

## 🚀 Kurulum ve Çalıştırma

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları sırayla takip edin:

### 1. Gereksinimler
- **Node.js** (v18 veya üzeri)
- **npm** veya **yarn**

### 2. Projeyi Klonlayın
```bash
git clone [https://github.com/elakonca/carwash-os.git](https://github.com/elakonca/carwash-os.git)
cd carwash-os

npm install
cp .env.example .env
npm run dev
