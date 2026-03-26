# TEDU VERA Demo Mode — Cozum Plani

> Tarih: 2026-03-26
> Yontem: Canli sitelerin Playwright ile incelenmesi + codebase analizi

---

## Mevcut Durum

**TEDU VERA'nin su anda calisan bir demo deneyimi yok.** Playwright ile dogrulanan bulgular:

- Demo sitesinde auto-login calismiyor (`VITE_DEMO_MODE` Vercel'de set edilmemis)
- Demo ve production siteleri birebir ayni — sifir gorsel fark
- Login duvari gecilemiyor — demo tamamen islevsiz
- Jury flow'a da ulasilamiyor (QR/token gerekiyor)
- Settings tab ilk giris noktasi olarak cok teknik

**Kok neden:** Demo mode sadece "ayri DB + ayri deployment" olarak dusunulmus. UX katmaninda demo deneyimi tasarlanmamis. `isDemoMode` prop AdminPanel'e geciyor ama sadece `console.log` icin kullaniliyor.

---

## Mimari Karar: 2 Vercel Projesi + 2 Supabase DB

```text
GitHub Repo (tedu-vera) — tek repo, tek branch (main)
  |
  +-- Vercel: tedu-vera.vercel.app (PRODUCTION)
  |     VITE_SUPABASE_URL = https://prod-project.supabase.co
  |     VITE_SUPABASE_ANON_KEY = prod-key
  |     VITE_DEMO_MODE = (set edilmez)
  |
  +-- Vercel: tedu-vera-demo.vercel.app (DEMO)
        VITE_SUPABASE_URL = https://demo-project.supabase.co
        VITE_SUPABASE_ANON_KEY = demo-key
        VITE_DEMO_MODE = true
        VITE_DEMO_ADMIN_EMAIL = demo@tedu.edu.tr
        VITE_DEMO_ADMIN_PASSWORD = ********
```

Neden iki ayri Vercel projesi (tek degil):

- Vercel'de preview env vars TUM preview deployment'lara uygulanir — PR preview'lari da demo DB'ye baglanir, istemedigimiz sey
- Iki proje ile env var izolasyonu garanti
- Bagimsiz deploy (demo'yu dondurabilirsin, prod'u guncellersin)
- Vercel'de iki proje acmak bedava, karmasiklik eklemiyor

Neden iki ayri Supabase DB:

- Demo DB'de jury scoring sandbox olarak yazilabilir
- Demo DB periyodik reset'lenir (seed'den rebuild)
- Production verisi korunmali — juri puanlari geri alinamaz
- Auth user pool'lari ayri (demo'da public auto-login, production'da gercek credentials)

---

## Demo Kullanici Rolu

Demo kullanicisi **super admin (read-only)** olarak giris yapar:

- Tum tenant'lari gorur (6 tenant seed'de mevcut)
- Organization management panelini gorur
- Tenant switcher calisir (filtre olarak departmanlar arasi gecis)
- Tum tab'lari gorur: Overview, Scores (Rankings/Analytics/Grid/Details), Settings
- **Hicbir yerde create/edit/delete yapamaz** — iki katmanli koruma

---

## Read-Only Enforcement: Frontend + Backend

Demo'da write islemleri iki katmanda engellenir:

### Katman 1: Frontend (UX)

`isDemoMode` flag'i ile tum write butonlari disabled/gizli. Kullanici tiklamaya calisinca bir sey olmuyor. Bu UX icin — kullaniciyi yanlis yonlendirmemek icin.

### Katman 2: Backend (gercek koruma)

Tum admin RPC'leri `rpc-proxy` Edge Function uzerinden geciyor. Bu tek chokepoint'e bir whitelist guard eklenir:

```text
supabase/functions/rpc-proxy/index.ts

  DEMO_MODE = Deno.env.get("DEMO_MODE") === "true"

  ALLOWED_IN_DEMO = {
    rpc_admin_semester_list,
    rpc_admin_project_list,
    rpc_admin_juror_list,
    rpc_admin_score_list,
    rpc_admin_audit_log,
    rpc_admin_org_list,
    rpc_admin_auth_get_session,
    rpc_admin_export_scores,
    rpc_admin_export_jurors,
    ... tum read/list/export RPC'leri
  }

  if DEMO_MODE and RPC not in ALLOWED_IN_DEMO:
    return 403 "Demo mode is read-only"
```

### Neden iki katman

```text
Senaryo 1: Normal kullanici
  "Delete" butonu disabled (frontend) --> tiklanamaz

Senaryo 2: Dev tools ile RPC cagrisi
  rpc-proxy: whitelist'te yok --> 403 rejected

Senaryo 3: Jury scoring (sandbox, izin verilen write)
  Jury RPC'leri rpc-proxy'den gecmez (ayri yol) --> calisir
  Demo DB'ye yazar, gunluk reset ile temizlenir
```

### Bu yaklasimin avantajlari

| Ozellik | Deger |
|---------|-------|
| Backend degisiklik | **1 dosya** (`rpc-proxy/index.ts`) + 1 Supabase secret (`DEMO_MODE=true`) |
| Migration | Yok |
| RPC degisikligi | Yok — mevcut RPC'ler aynen kalir |
| Whitelist | Yeni RPC eklenince default olarak demo'da blocked — unutma riski sifir |
| Bypass riski | Imkansiz — proxy backend'de, client tarafindan gecilemez |
| Jury scoring | Etkilenmez — jury RPC'leri ayri yoldan gecer |

---

## Admin Panel Demo Davranisi

### Genel

- Auto-login (zaten kodda var, env vars eksikti)
- Default tab: **Overview** (settings degil)
- Persistent demo banner: "Demo Mode — Sample data, resets daily"
- Tum destructive butonlar disabled (delete, restore, revoke, regenerate)

### Settings Tab

Tum paneller **gorunur** (super admin gorunumu), write aksiyonlari disabled:

| Panel | Gorunum | Disabled Aksiyonlar |
|-------|---------|---------------------|
| **Organization Management** | Gorunur — org listesi, admin listesi, tenant detaylari | Create/edit/delete org, add/remove admin, approve/reject |
| **Semester Management** | Gorunur — semester listesi, tarihler | Create/edit/delete semester, eval lock toggle |
| **Projects** | Gorunur — proje listesi | Create/edit/delete, bulk import |
| **Jurors** | Gorunur — juri listesi | Create/edit/delete, PIN reset, bulk import |
| **Access Settings** | Gorunur — eval lock durumu, edit mode | Toggle'lar disabled |
| **Jury Access Control (QR)** | Gorunur — QR code + copy link + download calisir | Generate/regenerate/revoke disabled |
| **Audit Log** | Gorunur — filter/search/export calisir | Zaten read-only |
| **Export Tools** | **Calisir** — sample data export demo degeri tasir | - |
| **Database Backup/Restore** | **Gizle** | Tamamen kaldir — destructive + teknik |

---

## Jury Flow Demo Davranisi

### Akis

```text
"Start Evaluation"
  |
  v
QR Showcase ekrani (yeni)
  "How Jurors Join in Production"
  QR code gorseli + aciklama
  [Continue to Demo Evaluation ->]
  |
  v
Identity (pre-filled: "Demo Juror", "TEDU EE", duzenlenebilir)
  [Continue ->]
  |
  v
Semester (auto-selected: "Spring 2026")
  [Continue ->]
  |
  v
PIN (pre-filled: 4 hane dolu, gorsel olarak goster)
  "In production, each juror receives a unique 4-digit PIN."
  [Continue ->]
  |
  v
Eval ekrani (tam interaktif, sample projeler)
  Puanlama calisir (demo DB'ye yazar, zararsiz)
  |
  v
Done ekrani
  "In production, scores are final. In demo, data resets daily."
```

### Tasarim prensipleri

- Her adim gorunsun, hicbiri atlanmasin — flow'un tamami VERA'nin deger onerisi
- Her adimda kucuk info text: "production'da bu soyle calisir"
- Pre-filled alanlar friction'i kaldirir ama adimlarin varligini gosterir
- QR showcase ekrani en basta: "admin QR uretir, juri tarar" hikayesini anlatir
- Eval ekraninda tam interaktivite — puanlama yapilabilir, bu demo'nun en etkileyici ani
- Jury scoring demo DB'ye yazilir — backend engellemez (jury RPC'leri proxy disinda)

---

## Dokunulacak Dosyalar

| Dosya | Degisiklik |
|-------|-----------|
| **Vercel dashboard** | Demo projesinde env vars set et |
| **Supabase demo project** | `DEMO_MODE=true` secret ekle |
| `supabase/functions/rpc-proxy/index.ts` | Whitelist guard — read-only RPC'lere izin ver, write RPC'leri 403 ile reddet |
| `App.jsx` | Landing page'e "Explore Demo" butonu, jury demo flow baslangici |
| `AdminPanel.jsx` | Demo banner componenti, default tab=overview (demo mode'da) |
| `SettingsPage.jsx` | `isDemoMode` ile write butonlarini disable, backup panelini gizle |
| `ManageOrganizationsPanel.jsx` | `isDemoMode` ile CRUD butonlarini disable |
| `ManageSemesterPanel.jsx` | `isDemoMode` ile CRUD butonlarini disable |
| `ManageProjectsPanel.jsx` | `isDemoMode` ile CRUD/import butonlarini disable |
| `ManageJurorsPanel.jsx` | `isDemoMode` ile CRUD/import/PIN butonlarini disable |
| `JuryEntryControlPanel.jsx` | `isDemoMode` ile generate/revoke disabled, QR/copy/download calisir |
| `ExportBackupPanel.jsx` | `isDemoMode` ile backup/restore gizle, export calisir |
| `useJuryState.js` | Demo mode'da pre-filled identity/semester/PIN, QR showcase adimi |
| `EvalStep.jsx` | Demo info karti |
| `DoneStep.jsx` | Demo info karti |
| `.github/workflows/` | Demo DB daily reset action (seed'den rebuild) |

---

## Demo DB Operasyonel Kurallar

| Kural | Detay |
|-------|-------|
| **Periyodik reset** | GitHub Action ile gunluk seed'den rebuild (`002_multi_tenant_seed.sql`) |
| **Sandbox yazma** | Jury scoring demo DB'ye yazabilir — reset'le temizlenir |
| **Admin write'lar** | rpc-proxy whitelist ile engellenir — dev tools bypass imkansiz |
| **Sabit demo token** | QR code icin sabit token — regenerate disabled, her zaman ayni link |
| **Env var korumasi** | `VITE_DEMO_MODE`, `VITE_DEMO_ADMIN_EMAIL/PASSWORD` ASLA production'da set edilmez |
| **Supabase secret** | Demo Supabase projesinde `DEMO_MODE=true`, production'da bu secret yok |
| **CORS ayrimi** | Demo URL sadece demo Supabase'e, production URL sadece production Supabase'e erisir |

---

## Uygulama Sirasi

### Adim 1: Env vars + backend guard (yarim gun)

Vercel demo projesinde set et:

- `VITE_DEMO_MODE=true`
- `VITE_DEMO_ADMIN_EMAIL=...`
- `VITE_DEMO_ADMIN_PASSWORD=...`

Supabase demo projesinde:

- `DEMO_MODE=true` secret ekle

rpc-proxy'ye whitelist guard ekle:

- `supabase/functions/rpc-proxy/index.ts` icinde read RPC whitelist
- Whitelist disindaki RPC'ler 403 donur

### Adim 2: Demo banner + default tab (yarim gun)

- Persistent banner componenti: "Demo Mode — Sample data, resets daily"
- Demo mode'da default tab'i `overview` yap

### Adim 3: Admin read-only UI (1-2 gun)

- `isDemoMode` prop'u ile tum write butonlarini disable et (UX katmani)
- Backup/restore panelini gizle
- QR generate/revoke disable, copy/download calissin

### Adim 4: Jury demo flow (1-2 gun)

- QR showcase ekrani
- Pre-filled identity/semester/PIN
- Info kartlari (eval + done ekranlarinda)

### Adim 5: Demo DB daily reset (yarim gun)

- GitHub Action: gunluk seed rebuild
- Sabit demo juror + token

### Adim 6: Landing page iyilestirmesi (1 gun)

- "Explore Demo" butonu (admin auto-login)
- "Try as Juror" butonu (jury demo flow)
- Kisa urun aciklamasi / feature highlights

---

## Toplam tahmini efor: 5-6 gun

- 1 backend degisiklik: `rpc-proxy/index.ts` whitelist guard (tek dosya, migration yok)
- Frontend: `isDemoMode` conditional rendering (UX katmani)
- Infra: Vercel env vars + Supabase secret + GitHub Action
- RPC degisikligi yok, DB sema degisikligi yok, yeni rol yok
