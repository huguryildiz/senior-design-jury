# VERA Full UI Reset — Prototype → React Rewrite Plan

## Context

Mevcut React UI, prototype'dan çeşitli şekillerde sapma gösteriyor (Tailwind/shadcn mix, yanlış JSX dönüşümleri, eksik sayfalar). Incremental fix yerine **tüm UI katmanını sıfırdan yazacağız**. Prototype HTML tek kaynak. Hooks, API layer, state management korunacak — sadece JSX + CSS yeniden yazılacak.

**Kaynak:** `docs/concepts/vera-premium-prototype.html` (~28K satır, ~6K CSS, 75+ ekran)
**Hedef:** Birebir görsel/yapısal eşleşme

## Temel Kararlar ve Kurallar

### Yaklaşım

> Eski UI'yi koruma veya düzeltme.
> Prototype'taki ekranı tekrar oku.
> JSX'i sıfırdan yaz.
> CSS'i prototype'tan al.
> React wiring'i bağla.
> Birebir parity hedefle.

### Kapsam Kararları

- Bu iş incremental migration değil, **full UI reset** olarak yürütülecek
- Tailwind **tamamen** kaldırılacak
- shadcn **tamamen** kaldırılacak
- Eski UI **komple** silinecek
- Mevcut JSX patch edilmeyecek; prototype'taki ilgili ekran tekrar okunup JSX **sıfırdan** yazılacak

### Source of Truth

- `docs/concepts/vera-premium-prototype.html` **tek source of truth** olacak
- Kod prototype'a uymalı; prototype koda uydurulmayacak
- Section isimleri, metinler, layout ve blok hiyerarşisi keyfi olarak değiştirilmeyecek
- Büyük sapma varsa patch yerine **rewrite from prototype** uygulanacak

### CSS ve Styling

- Prototype CSS'i doğrudan alınacak; ilk aşamada cleanup/refactor yapılmayacak
- Tailwind utility class'ları kullanılmayacak
- shadcn component'ları kullanılmayacak

### Davranış ve Chart'lar

- Prototype JS davranışları React state/event yapısına rewrite edilecek
- Chart'lar prototype'ta nasıl görünüyorsa öyle yapılacak

### Korunan Katmanlar

- Hooks, API layer, selectors, auth/state management ve business logic korunacak
- API contract, hook output shape ve selector output shape değiştirilmeyecek
- Yalnızca UI wiring için zorunlu minimal değişiklik yapılabilecek

### Refactoring Yasağı

- Parity sağlanana kadar erken abstraction/component extraction yapılmayacak
- Önce birebir çalışsın, sonra refactor edilsin

### Phase Yürütme Kuralları

- Her phase sonunda:
  - Yapılanları özetle
  - Silinen / eklenen / yeniden yazılan dosyaları yaz
  - Parity açısından kritik notları belirt
  - Varsa minimal logic değişikliklerini açıkça yaz
  - Sonraki phase'i söyle ve dur
- Sonnet ile implement edilecekse her phase **tek bir context'e sığacak** şekilde yürütülecek
- Bir response içinde sadece tek phase yapılacak

### Branch ve Worktree Kuralları

- Bu çalışma için **ayrı bir worktree açılmayacak**
- Tüm UI reset işi **doğrudan current main branch üzerinde** yürütülecek
- Başka stale/diverged branch'ler varsa, unique gerekli iş içermiyorsa kaldırılacak
- Claude/Codex yeni worktree veya alternatif branch önermeyecek
- Tek güvenilir baseline **main branch** olacak

### Güvenlik

- Phase 0 başlamadan önce mevcut main için bir **backup tag** (`pre-ui-reset`) alınacak
- Phase 0'da shared UI dependencies ve styling layer temizlensin; page JSX dosyaları ilgili phase'de replace edilsin

### Chart Stratejisi

- Prototype'ta Chart.js ile render edilen grafikler React içinde de **Chart.js** (`react-chartjs-2`) ile yeniden kurulacak
- Custom SVG/HTML yalnızca prototype'ta Chart.js ile yapılmayan, HTML/CSS-only chart'larda (lollipop, attainment bar gibi) kullanılacak
- Phase 15 yeni chart yazma phase'i **değildir**; chart'lar ilgili page phase'lerinde (Phase 2, 4) yazılacak
- Phase 15 = **final chart parity polish, remaining fixes, cross-page consistency check**

### Tracking

- Repo içinde ayrıca bir **parity tracker** tutulacak (`docs/audits/ui-parity-tracker.md`)
- Tracker alanları: Screen, Prototype line range, Target React file, Status, Parity, Notes

### Cleanup

- Tailwind tamamen kaldırıldıktan sonra `src/lib/utils.js` içindeki `cn()` helper (clsx + tailwind-merge) artık kullanılmıyorsa silinecek
- `tailwind.config.js`, `postcss.config.js` Tailwind kaldırıldıktan sonra silinecek veya minimal CSS-only config'e dönüştürülecek

### Phase Validation Checklist

Her phase sonunda aşağıdaki kontroller yapılacak:

1. **Text parity** — section isimleri, başlıklar, alt başlıklar, buton metinleri
2. **Section parity** — tüm bloklar mevcut, eksik section yok
3. **Layout parity** — grid yapısı, kolon sayısı, sıralama
4. **Spacing parity** — padding, gap, margin değerleri
5. **Background/theme parity** — gradient, glow, glassmorphism
6. **Dark/light parity** — her iki mod doğru çalışıyor
7. **Mobile parity** — responsive breakpoint'ler, sidebar toggle
8. **Interaction parity** — click, hover, toggle, dropdown davranışları

### Phase Sonucu Formatı

Her phase tamamlandığında şu format kullanılacak:

```text
## Yapılanlar
- ✅ Tamamlanan işler
- ⚠️ Kısmen tamamlanan / dikkat gerekenler
- ⏳ Sonraki phase'e kalanlar

## Dosya Değişiklikleri
- Silinen dosyalar
- Eklenen dosyalar
- Sıfırdan yazılan dosyalar
- Güncellenen dosyalar

## Parity Notları
- Prototype ile birebirlik açısından kritik noktalar

## Logic / Wiring Notları
- Zorunlu minimal logic değişiklikleri (varsa)
- Hook/API/selector contract değişikliği olup olmadığı

## Sonraki Adım
- Sadece sıradaki phase (yeni phase'e başlanmaz, durulur)
```

## Strateji

```text
Her phase için:
1. Eski UI dosyalarını sil (JSX render + CSS)
2. Prototype'taki ilgili ekranı oku
3. JSX'i sıfırdan yaz (prototype HTML → React)
4. CSS'i prototype'tan aynen kopyala
5. Hook wiring'i bağla (mevcut hook'lar korunuyor)
6. Doğrula (dev server'da aç, prototype ile yan yana karşılaştır)
7. Parity tracker'ı güncelle
```

## Korunacaklar (SİLİNMEYECEK)

- `src/shared/api/` — Tüm API katmanı
- `src/shared/auth/AuthProvider.jsx` — Auth context
- `src/shared/theme/ThemeProvider.jsx` — Theme context
- `src/jury/useJuryState.js` + `src/jury/hooks/` — Jury state management
- `src/admin/hooks/` — Admin hooks (useAdminData, useAdminTabs, useSettingsCrud, vb.)
- `src/admin/selectors/` — Filter pipeline
- `src/admin/analytics/analyticsDatasets.js` — Chart data builders
- `src/admin/analytics/analyticsExport.js` — Export logic
- `src/admin/scoreHelpers.js` — Pure computation functions
- `src/shared/stats.js` — İstatistik hesaplamaları
- `src/config.js` — Criteria config
- `src/test/` — Test altyapısı
- `src/lib/utils.js` — cn() utility (Tailwind geçişi için geçici tutulacak)

## Silinecekler

- `src/components/ui/` — Tüm shadcn bileşenleri (57 dosya)
- `src/styles/globals.css` — Tailwind imports + eski token'lar
- `src/styles/prototype.css` — Eski partial extract
- `src/styles/pages/*.css` — Sayfa bazlı CSS
- `src/styles/jury-confetti.css`, `src/styles/jury-pin.css`
- Tüm JSX render dosyaları (aşağıdaki phase'lerde detaylı)

## CSS Mimarisi (Yeni)

Prototype'daki tüm CSS'i tek dosyaya kopyala, sonra mantıksal bölümlere ayır:

```text
src/styles/
├── variables.css      — :root + .dark-mode token'ları
├── base.css           — reset, typography, utilities
├── layout.css         — .admin-shell, .admin-main, .admin-header, sidebar
├── components.css     — .card, .btn-*, .badge, .pill-*, .dropdown-*, forms
├── pages/
│   ├── overview.css
│   ├── rankings.css
│   ├── analytics.css
│   ├── heatmap.css
│   ├── reviews.css
│   ├── jurors.css
│   ├── projects.css
│   ├── periods.css
│   ├── criteria.css
│   ├── outcomes.css
│   ├── entry-control.css
│   ├── pin-lock.css
│   ├── audit-log.css
│   ├── settings.css
│   └── export.css
├── jury.css           — jury flow tüm step'ler
├── landing.css        — landing page
├── auth.css           — login, register, forgot, reset
├── drawers.css        — .fs-drawer, .fs-modal, CRUD formları
├── modals.css         — confirmation modals
├── charts.css         — chart card'ları, legend, tooltip
└── print.css          — @media print (gerekirse eklenecek)
```

---

## Execution Phases

### Phase 0 — CSS Extraction + Cleanup

**Amaç:** Prototype CSS'i extract et, eski UI'yı sil, boş sayfa iskeletini kur.

**Adımlar:**

1. Prototype HTML'den tüm `<style>` bloklarını extract et → `src/styles/` altına yukarıdaki yapıda yerleştir
2. `src/styles/main.css` oluştur — tüm CSS dosyalarını import eden master file
3. `src/main.jsx`'te `main.css` import et (Tailwind import'larını kaldır)
4. `src/components/ui/` dizinini sil (shadcn)
5. Eski JSX render dosyalarını sil (Phase 1-7'de belirtilen dosyalar)
6. `tailwind.config.js`, `postcss.config.js`'yi devre dışı bırak veya minimal tut
7. `components.json` (shadcn config) sil
8. `index.html`'de font link'lerini prototype ile eşleştir (Google Fonts CDN)
9. `App.jsx`'i minimal skeleton'a dönüştür — sadece route switch, tüm page content boş

**Doğrulama:** `npm run dev` çalışır, boş sayfa görünür, console'da import hatası yok.

**Kritik dosyalar:**
- Sil: `src/components/ui/**`, `src/styles/globals.css`, `src/styles/prototype.css`, `src/styles/pages/*`, `src/styles/jury-*.css`, `components.json`
- Oluştur: `src/styles/variables.css`, `src/styles/base.css`, `src/styles/layout.css`, `src/styles/components.css`, `src/styles/main.css`

---

### Phase 1 — Admin Shell (Sidebar + Header + Layout)

**Prototype kaynağı:** Satır 11580-11710 (sidebar), satır ~2800-3100 (admin-shell CSS)

**Silinecek:**
- `src/admin/layout/AdminLayout.jsx`
- `src/admin/layout/AdminHeader.jsx`
- `src/admin/layout/AdminSidebar.jsx`
- `src/admin/components/SidebarProfileMenu.jsx`

**Yazılacak (sıfırdan):**
- `src/admin/layout/AdminLayout.jsx` — `.admin-shell` wrapper, mobile overlay
- `src/admin/layout/AdminSidebar.jsx` — `.sidebar` nav, theme toggle, tenant switcher, user menu
- `src/admin/layout/AdminHeader.jsx` — `.admin-header` breadcrumb, period select, refresh
- `src/styles/layout.css` — sidebar, header, admin-main CSS

**Hook bağlantıları:** `useTheme`, `useAuth`, `useAdminTabs` (korunuyor)

**Doğrulama:** Sidebar açılır/kapanır, dark/light toggle çalışır, sayfa navigasyonu çalışır.

---

### Phase 2 — Overview Page

**Prototype kaynağı:** Satır 11759-11982

**Silinecek:**
- `src/admin/OverviewTab.jsx`
- `src/admin/overview/KpiGrid.jsx`
- `src/admin/overview/KpiCard.jsx`
- `src/admin/overview/JurorActivityTable.jsx`
- `src/admin/overview/NeedsAttentionCard.jsx`
- `src/admin/overview/PeriodSnapshotCard.jsx`
- `src/admin/overview/CriteriaProgress.jsx`
- `src/admin/overview/CompletionByGroupCard.jsx`
- `src/admin/overview/TopProjectsCard.jsx`

**Yazılacak (sıfırdan):**
- `src/admin/OverviewPage.jsx` — Tüm Overview sayfası tek dosya
- İçerik: KPI grid (4 kart), Live Jury Activity table, Needs Attention + Period Snapshot (sağ stack), Live Feed card, Completion by Group card, Submission Timeline chart, Score Distribution chart, Top Projects table
- `src/styles/pages/overview.css`

**Hook bağlantıları:** `useAdminData` → `overviewMetrics`, `jurorStats`, `ranked`

---

### Phase 3 — Rankings Page

**Prototype kaynağı:** Satır 11985-12200

**Silinecek:**
- `src/admin/RankingsTab.jsx`
- `src/admin/scores/RankingsTable.jsx`

**Yazılacak:**
- `src/admin/RankingsPage.jsx` — KPI strip, filter panel, export panel, rankings table
- `src/styles/pages/rankings.css`

**Hook bağlantıları:** `useAdminData` → `ranked`, `summaryData`

---

### Phase 4 — Analytics Page

**Prototype kaynağı:** Satır 12200-13199 (~1000 satır)

**Silinecek:**
- `src/admin/analytics/AnalyticsTab.jsx`
- `src/admin/analytics/AnalyticsDashboardStates.jsx`
- `src/admin/analytics/AnalyticsPrintReport.jsx`
- `src/admin/analytics/TrendPeriodSelect.jsx`
- `src/admin/components/analytics/AnalyticsHeader.jsx`
- `src/charts/` — tüm chart component'ları (CompetencyRadarChart, CriterionBoxPlotChart, vb.)

**Yazılacak:**
- `src/admin/AnalyticsPage.jsx` — Tüm analytics sayfası
- İçerik: Header (title + MÜDEK badge + export), Analytics nav tabs (6 tab), Section 01: Attainment Status (8 traffic-light card), Section 02: Attainment Analysis (Rate chart + Gap lollipop), Section 03: Outcome by Group (bar chart), Section 04: Programme Overview (overview + radar), Section 05: Continuous Improvement (trend chart), Section 06: Group-Level Attainment, Section 07: Assessment Reliability (heatmap), Insight banners
- `src/charts/` — Yeni chart component'ları (Chart.js veya custom SVG, prototype'a uygun)
- `src/styles/pages/analytics.css`

**Hook bağlantıları:** `useAdminData` → `dashboardStats`, `submittedData`, trend hooks

---

### Phase 5 — Heatmap Page

**Prototype kaynağı:** Satır 13199-13288

**Silinecek:**
- `src/admin/ScoreGrid.jsx`
- `src/admin/useScoreGridData.js` (hook korunur, sadece JSX silinir — aslında hook da burada, dikkat)
- `src/admin/GridExportPrompt.jsx`

**Yazılacak:**
- `src/admin/HeatmapPage.jsx` — Header (title + subtitle + criteria tabs + export), matrix table, footer legend
- `src/styles/pages/heatmap.css`

**Hook bağlantıları:** `useScoreGridData`, `useGridSort`, `useGridExport`

**Not:** `useScoreGridData.js` hook olarak kalacak, sadece render JSX yeniden yazılacak. ScoreGrid.jsx içinde hook + render iç içe ise, hook'u ayırmak gerekebilir.

---

### Phase 6 — Reviews Page

**Prototype kaynağı:** Satır 13291-13490

**Silinecek:**
- `src/admin/ScoreDetails.jsx`
- `src/admin/components/details/ScoreDetailsHeader.jsx`
- `src/admin/components/details/ScoreDetailsFilters.jsx`
- `src/admin/components/details/ScoreDetailsTable.jsx`
- `src/admin/components/details/scoreDetailsColumns.jsx`
- `src/admin/components/details/scoreDetailsHelpers.js` (pure helper, korunabilir)
- `src/admin/components/details/scoreDetailsFilterConfigs.jsx`

**Yazılacak:**
- `src/admin/ReviewsPage.jsx` — Header (title + subtitle + search + filter + export), filter banner, KPI strip, status legend, filter panel, reviews table, pagination
- `src/styles/pages/reviews.css`

**Hook bağlantıları:** `useScoreDetailsFilters` (korunuyor)

---

### Phase 7 — Manage Pages (Jurors, Projects, Periods)

**Prototype kaynağı:** Jurors ~13492-14001, Projects ~14001-14294, Periods ~14294-14519

**Silinecek:**
- `src/admin/ManageJurorsPanel.jsx`, `src/admin/jurors/JurorsTable.jsx`
- `src/admin/ManageProjectsPanel.jsx`, `src/admin/projects/*.jsx`
- `src/admin/ManageSemesterPanel.jsx`
- `src/admin/pages/JurorsPage.jsx`, `ProjectsPage.jsx`, `SemestersPage.jsx`

**Yazılacak:**
- `src/admin/JurorsPage.jsx` — Header, KPI strip, toolbar (search + filter + export + import + add), filter panel, jurors table
- `src/admin/ProjectsPage.jsx` — Header, KPI strip, toolbar, projects table
- `src/admin/PeriodsPage.jsx` — Header, periods list, locked semester banner
- `src/styles/pages/jurors.css`, `projects.css`, `periods.css`

**Hook bağlantıları:** `useManageJurors`, `useManageProjects`, `useManageSemesters`

---

### Phase 8 — Configuration Pages (Criteria, Outcomes)

**Prototype kaynağı:** Criteria ~14519-14718, Outcomes ~14718-14797

**Silinecek:**
- `src/admin/criteria/CriteriaManager.jsx`, `CriterionEditor.jsx`, `RubricBandEditor.jsx`, `MudekPillSelector.jsx`, vb.
- `src/admin/CriteriaManager.jsx`
- `src/admin/pages/CriteriaPage.jsx`, `OutcomesPage.jsx`

**Yazılacak:**
- `src/admin/CriteriaPage.jsx` — Info banner, criteria list, criterion cards
- `src/admin/OutcomesPage.jsx` — Framework selector, outcome mapping table, coverage matrix
- `src/styles/pages/criteria.css`, `outcomes.css`

**Hook bağlantıları:** `useCriteriaForm`, criteria helpers

---

### Phase 9 — System Pages (Entry Control, PIN Blocking, Audit Log, Settings, Export)

**Prototype kaynağı:** Entry Control ~14797-15050, PIN ~15050-15159, Audit ~15159-15621, Export ~15621-15647, Settings ~15647-16350

**Silinecek:**
- `src/admin/pages/EntryControlPage.jsx`, `AuditLogPage.jsx`, `ExportPage.jsx`, `OrgSettingsPage.jsx`
- `src/admin/settings/PinResetDialog.jsx`, `AuditLogCard.jsx`, `ExportBackupPanel.jsx`

**Yazılacak:**
- `src/admin/EntryControlPage.jsx` — KPI strip, token table, QR display
- `src/admin/PinBlockingPage.jsx` — Lock policy status, lockout table
- `src/admin/AuditLogPage.jsx` — Search + filter, activity log table
- `src/admin/SettingsPage.jsx` — Multi-tab (profile, security, org)
- `src/admin/ExportPage.jsx` — Export format cards (XLSX, CSV, JSON)
- `src/styles/pages/entry-control.css`, `pin-lock.css`, `audit-log.css`, `settings.css`, `export.css`

---

### Phase 10 — Drawers + Modals

**Prototype kaynağı:** ~22545-26700 (drawer'lar + modal'lar)

**Silinecek:**
- `src/shared/ConfirmDialog.jsx` (yeniden yazılacak)

**Yazılacak:**
- `src/shared/Drawer.jsx` — Generic `.fs-drawer` wrapper
- `src/shared/Modal.jsx` — Generic `.fs-modal-wrap` wrapper
- Drawer içerikleri: Her CRUD formu prototype'dan birebir
  - `src/admin/drawers/AddProjectDrawer.jsx`, `EditProjectDrawer.jsx`, `AddJurorDrawer.jsx`, `EditJurorDrawer.jsx`, `AddSemesterDrawer.jsx`, `EditSemesterDrawer.jsx`, `EditCriteriaDrawer.jsx`, `AddOutcomeDrawer.jsx`, `EditProfileDrawer.jsx`, `ChangePasswordDrawer.jsx`, vb.
- Modal içerikleri: Confirmation dialog'lar
  - `src/shared/ConfirmModal.jsx` — Generic confirm
  - Sayfa bazlı modal'lar gerekirse ayrı dosya
- `src/styles/drawers.css`, `src/styles/modals.css`

---

### Phase 11 — Landing Page

**Prototype kaynağı:** ~10541-11159

**Silinecek:**
- `src/pages/LandingPage.jsx`

**Yazılacak:**
- `src/pages/LandingPage.jsx` — Nav bar, hero section, product showcase, feature cards, CTA
- `src/styles/landing.css`

---

### Phase 12 — Auth Screens

**Prototype kaynağı:** Login/auth CSS + HTML

**Silinecek:**
- `src/components/auth/LoginForm.jsx`
- `src/components/auth/RegisterForm.jsx`
- `src/components/auth/ForgotPasswordForm.jsx`
- `src/components/auth/ResetPasswordCreateForm.jsx`
- `src/components/auth/CompleteProfileForm.jsx`
- `src/admin/components/PendingReviewGate.jsx`

**Yazılacak:**
- `src/auth/LoginScreen.jsx` — Glassmorphic card, email/password, Google SSO, remember me
- `src/auth/RegisterScreen.jsx` — Application form, org search
- `src/auth/ForgotPasswordScreen.jsx`
- `src/auth/ResetPasswordScreen.jsx`
- `src/auth/CompleteProfileScreen.jsx`
- `src/auth/PendingReviewScreen.jsx`
- `src/styles/auth.css`

**Hook bağlantıları:** `useAuth` (korunuyor)

---

### Phase 13 — Jury Flow

**Prototype kaynağı:** ~16351-16700 (jury step'ler)

**Silinecek:**
- `src/JuryForm.jsx`
- `src/jury/JuryGatePage.jsx`
- `src/jury/InfoStep.jsx`
- `src/jury/PinStep.jsx`
- `src/jury/PinRevealStep.jsx`
- `src/jury/SheetsProgressDialog.jsx`
- `src/jury/EvalStep.jsx`, `EvalHeader.jsx`, `GroupStatusPanel.jsx`, `ScoringGrid.jsx`
- `src/jury/DoneStep.jsx`
- `src/jury/QRShowcaseStep.jsx` (varsa)

**Yazılacak:**
- `src/jury/JuryGatePage.jsx` — Token gate ekranı
- `src/jury/JuryFlow.jsx` — Step router (eski JuryForm yerine)
- `src/jury/steps/IdentityStep.jsx`
- `src/jury/steps/PinStep.jsx`
- `src/jury/steps/PinRevealStep.jsx`
- `src/jury/steps/LockedStep.jsx`
- `src/jury/steps/SemesterStep.jsx`
- `src/jury/steps/ProgressStep.jsx`
- `src/jury/steps/EvalStep.jsx` — Scoring grid, project nav, autosave indicator
- `src/jury/steps/DoneStep.jsx` — Confetti + thank you
- `src/styles/jury.css`

**Hook bağlantıları:** `useJuryState` + tüm sub-hook'lar (korunuyor)

---

### Phase 14 — App Shell + Routing

**Yazılacak (son):**
- `src/App.jsx` — Clean route switch (landing, auth, admin, jury)
- `src/main.jsx` — ThemeProvider, AuthProvider, CSS import
- `src/AdminPanel.jsx` — Tab router → page component'ları
- `src/admin/ScoresTab.jsx` — Rankings/Analytics/Heatmap/Reviews view switch

---

### Phase 15 — Charts

Chart component'ları Phase 4 (Analytics) ve Phase 2 (Overview) ile birlikte yazılacak ama burada listeliyorum:

**Yazılacak:**
- `src/charts/SubmissionTimelineChart.jsx` — Overview: Zaman bazlı aktivite (Chart.js line)
- `src/charts/ScoreDistributionChart.jsx` — Overview: Histogram (Chart.js bar)
- `src/charts/AttainmentRateChart.jsx` — Analytics: Horizontal bar + threshold
- `src/charts/ThresholdGapChart.jsx` — Analytics: Diverging lollipop (custom SVG)
- `src/charts/OutcomeByGroupChart.jsx` — Analytics: Grouped bar
- `src/charts/OutcomeOverviewChart.jsx` — Analytics: Overview chart
- `src/charts/CompetencyRadarChart.jsx` — Analytics: Radar
- `src/charts/OutcomeTrendChart.jsx` — Analytics: Multi-line trend
- `src/charts/JurorConsistencyHeatmap.jsx` — Analytics: Heatmap
- `src/charts/GroupAttainmentHeatmap.jsx` — Analytics: Group-level heatmap
- `src/charts/chartUtils.js` — Shared helpers
- `src/styles/charts.css`

---

## Execution Sırası

```text
Phase 0  → CSS extraction + cleanup (temel altyapı)
Phase 1  → Admin shell (sidebar, header, layout)
Phase 2  → Overview (ilk görüntülenen sayfa)
Phase 3  → Rankings
Phase 4  → Analytics (en büyük gap)
Phase 5  → Heatmap
Phase 6  → Reviews
Phase 7  → Manage pages (Jurors, Projects, Periods)
Phase 8  → Configuration pages (Criteria, Outcomes)
Phase 9  → System pages (Entry Control, PIN, Audit, Settings, Export)
Phase 10 → Drawers + Modals
Phase 11 → Landing page
Phase 12 → Auth screens
Phase 13 → Jury flow
Phase 14 → App shell + routing (final wiring)
Phase 15 → Charts (Phase 2 + 4 ile paralel yazılabilir)
```

## Doğrulama

Her phase sonunda:
1. `npm run dev` — Sayfa hatasız yüklenir
2. Prototype HTML'i browser'da aç, yan yana karşılaştır
3. Dark mode + light mode kontrol
4. Mobile responsive kontrol
5. Hook'lar çalışır (data yüklenir, interaction çalışır)

Final doğrulama:
- `npm run build` — Production build başarılı
- `npm test -- --run` — Mevcut testler (güncellenmesi gerekecek)
- Her sayfa prototype ile birebir eşleşir

---

## Parity Tracker

Bu tablo her phase sonunda güncellenir. **Status**: Not Started / In Progress / Done. **Parity**: Full / Partial / Missing.

| Screen | Prototype Range | Target React File | Status | Parity | Notes |
| ------ | --------------- | ----------------- | ------ | ------ | ----- |
| CSS Layer | style blocks | src/styles/*.css | Not Started | Missing | Phase 0 |
| Admin Shell | 11580-11710 | src/admin/layout/*.jsx | Not Started | Missing | Phase 1 |
| Overview | 11759-11982 | src/admin/OverviewPage.jsx | Not Started | Missing | Phase 2 |
| Rankings | 11985-12200 | src/admin/RankingsPage.jsx | Not Started | Missing | Phase 3 |
| Analytics | 12200-13199 | src/admin/AnalyticsPage.jsx | Not Started | Missing | Phase 4 |
| Heatmap | 13199-13288 | src/admin/HeatmapPage.jsx | Not Started | Missing | Phase 5 |
| Reviews | 13291-13490 | src/admin/ReviewsPage.jsx | Not Started | Missing | Phase 6 |
| Jurors | 13492-14001 | src/admin/JurorsPage.jsx | Not Started | Missing | Phase 7 |
| Projects | 14001-14294 | src/admin/ProjectsPage.jsx | Not Started | Missing | Phase 7 |
| Periods | 14294-14519 | src/admin/PeriodsPage.jsx | Not Started | Missing | Phase 7 |
| Criteria | 14519-14718 | src/admin/CriteriaPage.jsx | Not Started | Missing | Phase 8 |
| Outcomes | 14718-14797 | src/admin/OutcomesPage.jsx | Not Started | Missing | Phase 8 |
| Entry Control | 14797-15050 | src/admin/EntryControlPage.jsx | Not Started | Missing | Phase 9 |
| PIN Blocking | 15050-15159 | src/admin/PinBlockingPage.jsx | Not Started | Missing | Phase 9 |
| Audit Log | 15159-15621 | src/admin/AuditLogPage.jsx | Not Started | Missing | Phase 9 |
| Settings | 15647-16350 | src/admin/SettingsPage.jsx | Not Started | Missing | Phase 9 |
| Export | 15621-15647 | src/admin/ExportPage.jsx | Not Started | Missing | Phase 9 |
| Drawers | 22545-26560 | src/admin/drawers/*.jsx | Not Started | Missing | Phase 10 |
| Modals | 24252-26700 | src/shared/ConfirmModal.jsx | Not Started | Missing | Phase 10 |
| Landing | 10541-11159 | src/pages/LandingPage.jsx | Not Started | Missing | Phase 11 |
| Auth Screens | CSS+HTML | src/auth/*.jsx | Not Started | Missing | Phase 12 |
| Jury Flow | 16351-16700 | src/jury/steps/*.jsx | Not Started | Missing | Phase 13 |
| App Shell | — | src/App.jsx, AdminPanel.jsx | Not Started | Missing | Phase 14 |
| Charts Polish | — | src/charts/*.jsx | Not Started | Missing | Phase 15 |
