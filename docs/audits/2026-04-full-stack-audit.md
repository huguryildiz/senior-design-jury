# VERA Full-Stack Audit & Fix Plan (v3 — Admin + Jury)

## Context

Admin panel + jury flow'u uçtan uca denetlendi: CRUD akislari, veri yukleme zincirleri, hesaplama mantiklari, cross-page tutarlilik ve jury evaluation flow. 3 turda 50+ dosya incelendi. Tum bulgular dosya:satir bazinda dogrulanmistir.

---

## 1. Executive Summary

| Metrik | Deger |
|--------|-------|
| Taranan admin sayfasi | 15 |
| Taranan hook/selector/util | 19 |
| Taranan API modulu | 13 |
| **Dogrulanmis bug (Critical)** | **10** |
| **Dogrulanmis bug (High)** | **4** |
| Suspicious / risky alan | 6 |
| Tespit edilen yapi kalip sorunu | 5 |

### 1. turda bulunan: 7 Critical + 4 High (BUG-1 — BUG-11)

### 2. turda dogrulanan: 11/11 onaylanmis + 3 yeni Critical bulgu (BUG-12, BUG-13, BUG-14)

---

## 2. Dogrulanmis Bug Listesi (Tam)

### CRITICAL — Uygulama fonksiyonunu bozan

#### BUG-1: `adminListAuditLogs` tanimli degil
- **Dosya**: [useAuditLogFilters.js:204](src/admin/hooks/useAuditLogFilters.js#L204)
- **Root cause**: Line 8'de `listAuditLogs` import ediliyor, line 204'de `adminListAuditLogs()` cagiriliyor
- **Etki**: Audit log export crash — `TypeError`
- **Fix**: `adminListAuditLogs` → `listAuditLogs`
- **Regresyon**: Yok — tek call site, diger import'lar etkilenmez

#### BUG-2: `setCurrentPeriod` eksik `organizationId`
- **Dosya**: [useManagePeriods.js:210](src/admin/hooks/useManagePeriods.js#L210)
- **Root cause**: `setCurrentPeriod(periodId)` cagiriliyor ama API `(periodId, organizationId)` bekliyor ([periods.js:18](src/shared/api/admin/periods.js#L18))
- **Etki**: Set current sessiz basarisiz — `.eq("organization_id", undefined)`
- **Fix**: `setCurrentPeriod(periodId, organizationId)` — `organizationId` hook props'unda mevcut (line 52)
- **Regresyon**: Yok — tek call site

#### BUG-3: `createProject` response field mismatch
- **Dosya**: [useManageProjects.js:125,189,248](src/admin/hooks/useManageProjects.js#L125)
- **Root cause**: `res?.project_id || res?.projectId` kontrol ediliyor ama API `{ id }` doner
- **Etki**: Proje ekleme/import "Could not create group" hatasini firlatir
- **Fix**: `res?.project_id || res?.projectId` → `res?.id` (3 yer)
- **Regresyon**: Yok — `applyProjectPatch({id: ...})` zaten `id` field'ini bekliyor

#### BUG-4: `createJuror` response field mismatch
- **Dosya**: [useManageJurors.js:203,259](src/admin/hooks/useManageJurors.js#L203)
- **Root cause**: `created?.juror_id` kontrol ediliyor ama API `{ id }` doner
- **Etki**: Juror ekleme/import patch atlanir, sayfa refresh gerekir
- **Fix**: `created?.juror_id` → `created?.id`, patch objelerinde de `juror_id: created.id`
- **Regresyon**: Dusuk — `applyJurorPatch` line 84'de `patch.juror_id || patch.jurorId || patch.id` defensive pattern var

#### BUG-5: `updateMemberAdmin` field name mismatch
- **Dosya**: [useManageOrganizations.js:319](src/admin/hooks/useManageOrganizations.js#L319)
- **Root cause**: Hook `{ name: ... }` gonderiyor, API `payload.displayName` arayor ([organizations.js:94](src/shared/api/admin/organizations.js#L94))
- **Etki**: Display name guncelleme sessizce atlanir
- **Fix**: `name:` → `displayName:`
- **Regresyon**: Yok — tek call site, diger field'lar (email) sorunsuz

#### BUG-6: `deleteMemberHard` parameter type mismatch
- **Dosya**: [useManageOrganizations.js:339](src/admin/hooks/useManageOrganizations.js#L339)
- **Root cause**: `deleteMemberHard({ organizationId, userId })` obje, API `deleteMemberHard(userId)` string bekliyor
- **Etki**: `.eq("user_id", "[object Object]")` — silme her zaman basarisiz
- **Fix**: `deleteMemberHard(userId)`
- **Regresyon**: Yok — tek call site

#### BUG-7: `updateOrganization` duplicate code overwrite
- **Dosya**: [organizations.js:67-69](src/shared/api/admin/organizations.js#L67)
- **Root cause**: Line 67 ve 69 ayni `updates.code` field'ini yaziyor
- **Etki**: `shortLabel` varsa `code`'u ezer
- **Fix**: Birlestir: `updates.code = payload.code ?? payload.shortLabel`
- **Regresyon**: Dusuk — `handleUpdateOrg` hook'undan gelen payload'i kontrol et

#### BUG-12 (YENi): `getCellState(r)` criteria parametresi eksik — useManageJurors
- **Dosya**: [useManageJurors.js:111](src/admin/hooks/useManageJurors.js#L111)
- **Root cause**: `getCellState(r)` cagirisinda `criteria` parametresi yok. `getCellState(entry, criteria = [])` default `[]` ile `filledCount` her zaman 0, sonuc her zaman `"empty"`.
- **Etki**: `_buildEnrichedJurors` icinde `scoredByJuror` ve `startedByJuror` Map'leri bos kalir → tum juror'lar `scoredProjects: 0`, `startedProjects: 0` alir → `overviewStatus` sadece `editEnabled` ve `finalSubmittedAt` durumlarini dogru gosterir, `"ready_to_submit"` ve `"in_progress"` ASLA donmez
- **Kanit**: Codebase'de 15+ `getCellState` cagrisi var, 12'si `criteria` gonderir, 3'u gondermez
- **Fix**: `getCellState(r)` → `getCellState(r, criteria)` — criteria'yi `_buildEnrichedJurors`'a parametre olarak gec
- **Regresyon**: Dusuk — fonksiyon zaten kirik, dogru calismasi regresyon degil

#### BUG-13 (YENi): `getCellState(d)` criteria eksik — JurorActivity (2 yer)
- **Dosya**: [JurorActivity.jsx:18](src/admin/components/JurorActivity.jsx#L18), [line 178](src/admin/components/JurorActivity.jsx#L178)
- **Root cause**: Ayni sorun — `getCellState(d)` ve `getCellState(entry)` criteria olmadan cagirilir
- **Etki**: `startedCount` her zaman 0 → `"in_progress"` durumu hic gosterilmez. `scoredCount` line 17'de farkli mantikla (`d.total !== null`) hesaplaniyor, bu kismi dogru ama tutarsiz
- **Fix**: `criteria` prop'unu `getOverallStatus` fonksiyonuna gec, `getCellState(d, criteria)` olarak cagir. Line 178'de de ayni.
- **Regresyon**: Dusuk — bilinen bir bug duzeltildi (docs/superpowers/plans icinde filterPipeline icin ayni fix belgelenmis)

#### BUG-14 (YENi): OverviewPage `jurorStatus()` canonical `getJurorWorkflowState()`'den farkli
- **Dosya**: [OverviewPage.jsx:33-41](src/admin/pages/OverviewPage.jsx#L33)
- **Root cause**: OverviewPage kendi `jurorStatus(j)` fonksiyonunu tanimliyor:
  - `completedProjects` field'ini kullaniyor (ready_to_submit yerine "partial" doner)
  - 5 state yerine: "completed", "editing", "in_progress", **"partial"** (yanlis isim), "not_started"
  - Canonical `getJurorWorkflowState()` → "ready_to_submit" donmesi gereken durumda "partial" doner
- **Etki**: Overview badge'leri diger sayfalarla tutarsiz — ayni juror baska durumda gosterilir
- **Fix**: Custom fonksiyonu kaldir, import `getJurorWorkflowState` from scoreHelpers (veya `allJurors`'dan gelen pre-computed status kullan)
- **Regresyon**: Dusuk — OverviewPage-isolated

### HIGH — Yanlis/eksik UI bilgisi

#### BUG-8: OverviewPage `semester_name` field yok
- **Dosya**: [OverviewPage.jsx:241,388](src/admin/pages/OverviewPage.jsx#L241)
- **Root cause**: `selectedPeriod?.semester_name` — DB'de `name` kolonu var, `semester_name` yok
- **Etki**: KPI sub-text ve Period Snapshot karti "—" gosteriyor
- **Fix**: `semester_name` → `name || semester_name` (diger sayfalardaki gibi)
- **Regresyon**: Yok
- **Cross-page kontrol**: AdminLayout:379, AdminHeader:49, RankingsPage:204, ExportPage:57 hepsi `name` fallback kullanir — sadece OverviewPage eksik

#### BUG-9: AuditLogPage Anomalies hardcoded "0"
- **Dosya**: [AuditLogPage.jsx:146](src/admin/pages/AuditLogPage.jsx#L146)
- **Root cause**: `<span className="success">0</span>` — hesaplama yok
- **Etki**: Yaniltici KPI
- **Fix**: Hesaplama ekle veya KPI'yi kaldir
- **Regresyon**: Yok

#### BUG-10: OverviewPage "of 100" hardcoded
- **Dosya**: [OverviewPage.jsx:251](src/admin/pages/OverviewPage.jsx#L251)
- **Root cause**: `<div className="kpi-sub">of 100</div>` — criteria max konfigurasyona bagli
- **Etki**: Criteria toplami 100 degilse yanlis bilgi
- **Fix**: `criteriaConfig` prop'undan toplam max hesapla
- **Regresyon**: Yok

#### BUG-11: ExportPage `.catch(() => [])` sessiz hata yutma
- **Dosya**: [ExportPage.jsx:52](src/admin/pages/ExportPage.jsx#L52)
- **Root cause**: `getProjectSummary(sem.id).catch(() => [])` — hata sessizce yutulur
- **Etki**: Export dosyasinda summary verisi eksik, kullanici farketmez
- **Benzer pattern**: useAdminData.js:160,241,281 — ayni `.catch(() => [])` pattern'i 4 yerde daha var
- **Fix**: Hatali period'lari warning ile belirt
- **Regresyon**: Dusuk

---

## 3. Cross-Page Tutarlilik Raporu

### 3.1 Juror Status: 5 Farkli Implementasyon (olmasi gereken: 1)

| Implementasyon | Dosya | getCellState+criteria? | editEnabled once? | Sonuc |
|---------------|-------|----------------------|-------------------|-------|
| **scoreHelpers** (canonical) | scoreHelpers.js:47 | EVET | EVET | DOGRU |
| **filterPipeline** | filterPipeline.js:194 | EVET | EVET | DOGRU |
| **useManageJurors** | useManageJurors.js:111 | HAYIR (BUG-12) | EVET | KIRIK |
| **JurorActivity** | JurorActivity.jsx:18 | HAYIR (BUG-13) | EVET | KIRIK |
| **OverviewPage** | OverviewPage.jsx:33 | N/A | EVET | FARKLI (BUG-14) |

**Etki**: Ayni juror farkli sayfalarda farkli status gosteriyor:
- HeatmapPage + ReviewsPage → dogru (scoreHelpers + filterPipeline)
- JurorsPage → kirik (useManageJurors, `in_progress`/`ready_to_submit` calismaz)
- OverviewPage → farkli (kendi fonksiyonu, "partial" vs "ready_to_submit")

### 3.2 Period Field Naming

| Dosya | Kullanim | Dogru mu? |
|-------|----------|-----------|
| AdminLayout.jsx:379 | `name \|\| semester_name` | EVET |
| AdminHeader.jsx:49 | `name \|\| semester_name` | EVET |
| RankingsPage.jsx:204 | `name \|\| semester_name` | EVET |
| AnalyticsPage.jsx:625 | `name \|\| semester_name` | EVET |
| ExportPage.jsx:57 | `name \|\| period_name` | EVET |
| EntryControlPage.jsx:57 | `name \|\| period_name \|\| semester_name` | EVET |
| **OverviewPage.jsx:241** | `semester_name` | HAYIR (BUG-8) |
| **OverviewPage.jsx:388** | `semester_name` | HAYIR (BUG-8) |

### 3.3 Score Field Mapping (design/written, delivery/oral)

Tum sayfalarda tutarli: `dbScoresToUi()` API katmaninda uygulanir, UI katmani `design`/`delivery` kullanir. Sorun yok.

### 3.4 getCellState Kullanim Tutarliligi

15+ call site incelendi:

| Dosya | criteria geciyor mu? |
|-------|---------------------|
| filterPipeline.js:194,263 | EVET |
| gridSelectors.js:73,101 | EVET |
| HeatmapPage.jsx:60 | EVET |
| scoreHelpers.js:54,58,149,159 | EVET |
| exportXLSX.js:199,226 | EVET |
| useGridSort.js:144,159,160 | EVET |
| **useManageJurors.js:111** | HAYIR (BUG-12) |
| **JurorActivity.jsx:18,178** | HAYIR (BUG-13) |

---

## 4. Regresyon Risk Analizi

### Fix'ler baska yerleri bozabilir mi?

| Fix | Ayni API/fonksiyon baska nerede kullaniliyor? | Regresyon riski |
|-----|-----------------------------------------------|----------------|
| C1 (adminListAuditLogs) | Tek call site | YOK |
| C2 (setCurrentPeriod+orgId) | Tek call site | YOK |
| C3 (res?.id project) | `applyProjectPatch` line 194 zaten `id` kullaniyor | YOK |
| C4 (created?.id juror) | `applyJurorPatch` line 84 defensive: `patch.juror_id \|\| patch.id` | COK DUSUK |
| C5 (displayName) | Tek call site | YOK |
| C6 (deleteMemberHard) | Tek call site | YOK |
| C7 (code/shortLabel) | `handleUpdateOrg` payload'ini kontrol et | DUSUK |
| C8 (getCellState+criteria useManageJurors) | `_buildEnrichedJurors`'a criteria param ekle, enrichJurorScores'da gec | DUSUK |
| C9 (getCellState+criteria JurorActivity) | Props'dan criteria al, `getOverallStatus`'a gec | DUSUK |
| C10 (jurorStatus consolidation) | OverviewPage-isolated | DUSUK |
| H1 (semester_name) | 2 satir, isolated | YOK |
| H2 (Anomalies) | Isolated | YOK |
| H3 ("of 100") | Isolated | YOK |
| H4 (.catch(() => [])) | 4 yer daha var ama each degisiklik isolated | DUSUK |

### Ortak API fonksiyonlarini paylasan dosyalar

| API Function | Kullanildiği yerler |
|-------------|-------------------|
| `createProject` | useManageProjects (BUG-3) — tek caller |
| `createJuror` | useManageJurors (BUG-4) — tek caller |
| `setCurrentPeriod` | useManagePeriods (BUG-2) — tek caller |
| `updateMemberAdmin` | useManageOrganizations (BUG-5) — tek caller |
| `deleteMemberHard` | useManageOrganizations (BUG-6) — tek caller |
| `listAuditLogs` | useAuditLogFilters (BUG-1 export + normal load) |
| `getCellState` | 15+ yer — BUG-12,13 sadece 3 call site'i etkiler |

**Sonuc**: Tum fix'ler lokalize. Hicbiri baska modulleri paylasiyor ve hepsi tek call site'a sahip (getCellState harici). Regresyon riski dusuk.

---

## 5. Onceliklendirilmis Fix Plan (Guncel)

### Critical (10 bug)

| # | Bug | Dosya | Degisiklik |
|---|-----|-------|-----------|
| C1 | BUG-1 | useAuditLogFilters.js:204 | `adminListAuditLogs` → `listAuditLogs` |
| C2 | BUG-2 | useManagePeriods.js:210 | `setCurrentPeriod(periodId)` → `setCurrentPeriod(periodId, organizationId)` |
| C3 | BUG-3 | useManageProjects.js:125,189,248 | `res?.project_id \|\| res?.projectId` → `res?.id` |
| C4 | BUG-4 | useManageJurors.js:203,259 | `created?.juror_id` → `created?.id`, patch'lerde de |
| C5 | BUG-5 | useManageOrganizations.js:319 | `name:` → `displayName:` |
| C6 | BUG-6 | useManageOrganizations.js:339 | `deleteMemberHard({org,userId})` → `deleteMemberHard(userId)` |
| C7 | BUG-7 | organizations.js:67-69 | Duplicate → `payload.code ?? payload.shortLabel` |
| C8 | BUG-12 | useManageJurors.js:111 | `getCellState(r)` → `getCellState(r, criteria)` + criteria param ekle |
| C9 | BUG-13 | JurorActivity.jsx:18,178 | `getCellState(d)` → `getCellState(d, criteria)` + criteria prop drill |
| C10 | BUG-14 | OverviewPage.jsx:33-41 | Custom `jurorStatus()` kaldir, allJurors'dan pre-computed status kullan veya canonical fonksiyonu import et |

### High (4 bug)

| # | Bug | Dosya | Degisiklik |
|---|-----|-------|-----------|
| H1 | BUG-8 | OverviewPage.jsx:241,388 | `semester_name` → `name \|\| semester_name` |
| H2 | BUG-9 | AuditLogPage.jsx:146 | Hardcoded "0" → hesaplama veya kaldir |
| H3 | BUG-10 | OverviewPage.jsx:251 | "of 100" → criteria max'dan hesapla |
| H4 | BUG-11 | ExportPage.jsx:52 | `.catch(() => [])` → warning ile belirt |

---

## 6. Test Onerileri

### Must-Have (bu fix'lerle birlikte)

| Test | qaTest ID | Dosya | Dogrulama |
|------|-----------|-------|-----------|
| getCellState criteria param zorunlu | `helpers.cellstate.07` | scoreHelpers.test.js | `getCellState({technical:20}, [])` = "empty" |
| getCellState criteria ile | `helpers.cellstate.08` | scoreHelpers.test.js | `getCellState({technical:20}, [{id:"technical"}])` = "scored" |
| Juror workflow editing priority | `helpers.workflow.07` | scoreHelpers.test.js | editEnabled=true + final → "editing" |
| createProject response mapping | `manage.project.create.01` | useManageProjects test | `res.id` dogru parse edilir |
| createJuror response mapping | `manage.juror.create.01` | useManageJurors test | `res.id` dogru parse edilir |
| setCurrentPeriod params | `manage.period.current.01` | useManagePeriods test | organizationId gecirilir |

### Nice-to-Have (sonraki sprint)

| Test | qaTest ID | Dogrulama |
|------|-----------|-----------|
| Cross-page juror status tutarliligi | `consistency.status.01` | Ayni juror data → ayni status tum sayfalarda |
| OverviewPage KPI hesaplamasi | `overview.kpi.01` | completed, inProg, notStarted dogru sayilir |
| filterPipeline enrichRows | `pipeline.enrich.01` | Status enrichment criteria ile dogru |
| Ranking tie handling | `rankings.compute.01` | Ayni skor → ayni rank |
| Audit export call | `audit.export.01` | listAuditLogs fonksiyonu dogru cagirilir |

---

## 7. Degisecek Dosyalar (Tam Liste)

### Critical fix'ler (10 bug, 8 dosya):

```text
src/admin/hooks/useAuditLogFilters.js      — BUG-1 (1 satir)
src/admin/hooks/useManagePeriods.js         — BUG-2 (1 satir)
src/admin/hooks/useManageProjects.js        — BUG-3 (3 yer)
src/admin/hooks/useManageJurors.js          — BUG-4 (4+ yer), BUG-12 (1 yer + param ekleme)
src/admin/hooks/useManageOrganizations.js   — BUG-5, BUG-6 (2 yer)
src/shared/api/admin/organizations.js       — BUG-7 (2 satir → 1)
src/admin/components/JurorActivity.jsx      — BUG-13 (2 yer + prop ekleme)
src/admin/pages/OverviewPage.jsx            — BUG-14 (fonksiyon degisimi)
```

### High fix'ler (4 bug, 3 dosya):

```text
src/admin/pages/OverviewPage.jsx            — BUG-8 (2 yer), BUG-10 (1 yer)
src/admin/pages/AuditLogPage.jsx            — BUG-9 (1 yer)
src/admin/pages/ExportPage.jsx              — BUG-11 (1 yer)
```

---

## 8. Verification Plan

| Bug | Manuel Test |
|-----|------------|
| BUG-1 | Audit Log → Export → XLSX inmeli |
| BUG-2 | Periods → "Set Current" → sadece secilen current olmali |
| BUG-3 | Projects → "Add Group" → hatasiz eklenmeli, listede gorunmeli |
| BUG-4 | Jurors → "Add Juror" → hatasiz eklenmeli, listede gorunmeli |
| BUG-5 | Settings → Org admin name degistir → kaydedilmeli |
| BUG-6 | Settings → Org admin sil → silinmeli |
| BUG-7 | Settings → Org code guncelle → dogru deger |
| BUG-8 | Overview → Period adi gorunmeli ("—" degil) |
| BUG-9 | Audit Log → Anomalies gercek deger veya kaldirilmis |
| BUG-10 | Overview → "of X" criteria max'i gostermeli |
| BUG-11 | Export → Hata olursa warning gorunmeli |
| BUG-12 | Jurors sayfasi → scoring yapmis juror "in_progress" veya "ready_to_submit" gostermeli |
| BUG-13 | JurorActivity component → scoring yapmis juror'lar dogru status gostermeli |
| BUG-14 | Overview → Status badge'leri Rankings/Heatmap ile tutarli olmali |

---
---

# PART B: JURY FLOW AUDIT

---

## 9. Jury Flow — Executive Summary

Jury flow kapsamli olarak incelendi: entry/token validation, PIN auth, score save/autosave, submit/finalize, edit-mode/resume, ve tum step component'lar.

**Genel degerlendirme**: Jury flow **iyi mimaride** — temiz sub-hook ayirimi, ref-bazli async guvenlik, yazma deduplication'i, visibility autosave, session expiry handling ve edit-mode polling mevcut.

| Metrik | Deger |
|--------|-------|
| Taranan jury dosyasi | 20+ (hooks, steps, utils, API) |
| Dogrulanmis bug (Critical) | 0 |
| Dogrulanmis bug (High) | 1 |
| Dogrulanmis bug (Medium) | 2 |
| Structural limitation | 2 |
| Suspicious / risky alan | 3 |

---

## 10. Jury Flow Coverage Matrix

### 10.1 Step Component'lar

| Step | Component | Butonlar | Handler Bagli? | Validation | Durum |
|------|-----------|----------|---------------|-----------|-------|
| Identity | IdentityStep | Start Evaluation | handleIdentitySubmit ✓ | name+affiliation required ✓ | OK |
| Period | SemesterStep | Period card click | handlePeriodSelect ✓ | periodSelectLockRef ✓ | OK |
| PIN | PinStep | Verify (auto-submit) | handlePinSubmit ✓ | 4-digit numeric ✓ | OK |
| PIN Reveal | PinRevealStep | Copy + Continue | handlePinRevealContinue ✓ | Checkbox required ✓ | OK |
| Locked | LockedStep | Back | onBack ✓ | Countdown timer ✓ | OK |
| Progress | ProgressStep | Resume/Start | handleProgressContinue ✓ | — | OK |
| Eval | EvalStep | Prev/Next/Submit | handleNavigate, handleRequestSubmit ✓ | allComplete for submit ✓ | OK |
| Done | DoneStep | Edit/Exit | handleEditScores, clearLocalSession ✓ | editAllowed check ✓ | OK |

### 10.2 Data Loading Zincirleri

| Veri | API Method | Tip | Parametreler | Response Shape | Sorun |
|------|-----------|-----|-------------|---------------|-------|
| Periods (public) | listPeriodsPublic | REST | is_visible=true | { id, name, is_current, ... } | OK |
| Current period | getCurrentPeriod | REST | is_current=true | Single period row | OK |
| Entry token | verifyEntryToken | RPC | p_token | { ok, period_id, period_name } | OK |
| Authenticate | authenticateJuror | RPC | p_period_id, p_juror_name, p_affiliation | { needs_pin, pin_plain_once, ... } | OK |
| Verify PIN | verifyJurorPin | RPC | p_period_id, p_juror_name, p_affiliation, p_pin | { ok, juror_id, session_token } | OK |
| Projects+scores | listProjects | REST+view | periodId, jurorId | project list + scores | **Hardcoded total** |
| Period criteria | listPeriodCriteria | REST | periodId | criteria snapshot rows | OK |
| Edit state | getJurorEditState | REST | jurorId, periodId | { edit_allowed, lock_active, ... } | OK |
| Score upsert | upsertScore | RPC+retry | 7 params | { ok } | OK |
| Finalize | finalizeJurorSubmission | RPC | periodId, jurorId, sessionToken | { ok } | OK |
| Freeze snapshot | freezePeriodSnapshot | RPC | periodId | idempotent | OK |

### 10.3 Autosave / Write Flow

| Trigger | Handler | writeGroup? | Deduplication? | Error handling? |
|---------|---------|------------|---------------|----------------|
| Score onBlur | handleScoreBlur → writeGroup(pid) | ✓ | snapshot key ✓ | setSaveStatus("error") ✓ |
| Comment onBlur | handleCommentBlur → writeGroup(pid) | ✓ | snapshot key ✓ | ✓ |
| Group navigate | handleNavigate → writeGroup(currentPid) | ✓ | ✓ | ✓ |
| Tab hidden | visibility listener → writeGroup(currentPid) | ✓ | ✓ | pendingVisibilityError ✓ |
| Before submit | handleRequestSubmit → loop writeGroup | ✓ | ✓ | editState check ✓ |
| During submit | handleConfirmSubmit → loop writeGroup | ✓ | ✓ | session/lock check ✓ |

---

## 11. Jury Confirmed Bugs

### HIGH

#### JURY-BUG-1: `listProjects` hardcoded total hesaplamasi

- **Dosya**: [juryApi.js:113-114](src/shared/api/juryApi.js#L113-L114)
- **Root cause**: Jury `listProjects` fonksiyonunda total hesabi:
  ```javascript
  total: score
    ? (score.technical || 0) + (score.written || 0) + (score.oral || 0) + (score.teamwork || 0)
    : null,
  ```
  4 sabit DB kolon adi kullaniliyor. Custom criteria key'leri ile bu hesap yanlis sonuc verir.
- **Baglamli**: `scores_compat` VIEW de ayni 4 key'i hardcode ediyor (structural limitation)
- **Simdiki etki**: Standard 4 criteria ile dogru calisiyor. Custom criteria kullanilmadigi surece sorun yok.
- **Gelecek etki**: Custom criteria eklendiginde total hesabi kirilir
- **Fix**: `effectiveCriteria`'dan dynamic toplam hesapla, veya `scores_compat` VIEW'i dynamic yap

### MEDIUM

#### JURY-BUG-2: `outcomeConfig` dead code — removed column'dan okuyor

- **Dosya**: [useJurySessionHandlers.js:90](src/jury/hooks/useJurySessionHandlers.js#L90)
- **Root cause**: `period.outcome_config || []` — ama `outcome_config` kolonu `periods` tablosundan kaldirilmis (`sql/migrations/004_periods_and_execution.sql:8`: "REMOVED: criteria_config JSONB, outcome_config JSONB"). Jury `listPeriods` bu kolonu select etmiyor.
- **Etki**: `outcomeConfig` her zaman `[]`, `outcomeLookup` her zaman bos. Jury step component'lari `outcomeLookup` kullanmiyor (grep: no matches in steps/). Dead code ama sorun yok.
- **Fix**: Dead code'u temizle — `outcomeConfig` state'ini ve `outcomeLookup` derivation'ini kaldir (veya gelecekte period_outcomes table'dan yukle)

#### JURY-BUG-3: `upsertScore` criteriaConfig parametre fragility

- **Dosya**: [juryApi.js:42-66](src/shared/api/juryApi.js#L42-L66), [useJuryAutosave.js:97](src/jury/hooks/useJuryAutosave.js#L97)
- **Root cause**: `upsertScore`'a raw `criteriaConfig` (period_criteria DB rows) geciyor. Fonksiyon icinde `scores[c.id] ?? scores[c.key]` ile fallback yapiyor. `c.id` DB UUID'si, `c.key` "design" gibi key. Scores state `key` bazli oldugu icin `scores[UUID]` → undefined, `scores[key]` → value. Calisiyor ama fallback'e bagimli.
- **Etki**: Simdiki haliyle calisir. Ama `criteriaConfig` yerine `effectiveCriteria` (normalized, `id = key`) gecirilseydi daha temiz olurdu.
- **Fix**: `writeGroup`'ta `upsertScore(..., effectiveCriteria)` gec (criteriaConfig yerine)

---

## 12. Jury Suspicious / Risky Alanlar

| Alan | Dosya | Risk | Detay |
|------|-------|------|-------|
| `scores_compat` VIEW hardcoded | sql/migrations | Structural | Sadece 4 criteria key destekliyor. Custom criteria icin yeni mekanizma lazim |
| handleIdentitySubmit double-click | IdentityStep.jsx | Low | Form validation var ama explicit loading guard yok |
| handleNavigate no debounce | useJuryLifecycleHandlers.js | Low | Hizli tiklamalar sirayla writeGroup kuyruge alir; async dogru siralar ama UI hissi lag yapabilir |

---

## 13. Jury-Admin Cross-Check

### Score field tutarliligi

| Jury write (upsertScore) | DB storage | scores_compat VIEW | Admin read (getScores) | UI display |
|--------------------------|-----------|-------------------|----------------------|-----------|
| key: "technical" | period_criteria.key match | AS technical | dbScoresToUi: technical | technical |
| key: "design" | period_criteria.key match | AS written | dbScoresToUi: design | design |
| key: "delivery" | period_criteria.key match | AS oral | dbScoresToUi: delivery | delivery |
| key: "teamwork" | period_criteria.key match | AS teamwork | dbScoresToUi: teamwork | teamwork |

Sonuc: **Tutarli** — jury yazisi ve admin okumasi ayni pipe'dan geciyor.

### Criteria model tutarliligi

| Kaynak | Jury | Admin |
|--------|------|-------|
| Criteria yukle | `listPeriodCriteria(periodId)` | `listPeriodCriteria(periodId)` |
| Normalize | `getActiveCriteria(rows)` | `getActiveCriteria(rows)` |
| Render | `effectiveCriteria` (key=id) | `criteriaConfig` prop |

Sonuc: **Tutarli** — ayni fonksiyonlar, ayni normalization.

### Session/token model

- Jury session token: 12h expiry, DB-enforced
- Admin: JWT-based auth (Supabase Auth) — tamamen ayri mekanizma
- Cross-contamination riski: **Yok** — farkli auth katmanlari

---

## 14. Jury Verification Plan

| Test | Nasil |
|------|-------|
| Entry token flow | QR → gate page → verify → jury form acilmali |
| PIN auth | Dogru PIN → projects yuklenmeli; yanlis PIN → hata + kalan deneme |
| PIN lockout | 3 yanlis → 15 min lock, timer gostermeli |
| Score autosave | Input → blur → writeGroup → DB'ye yazilmali |
| Group navigation | Prev/Next → mevcut grup kaydedilmeli, sonra gecilmeli |
| Visibility save | Tab gizle → writeGroup tetiklenmeli |
| Submit flow | allComplete → confirm dialog → finalize → done step |
| Resume flow | Tekrar giris → ProgressStep → mevcut skorlarla eval |
| Edit mode | Admin edit acar → juror tekrar degistirir → re-submit |
| Session expiry | 12h sonra write fail → pin step'e donmeli |
| Period lock | Admin lock → jury writeGroup reddedilmeli |

---

## 15. Combined Priority — Admin + Jury

### Critical (10 admin bug — hemen duzelt)

C1–C10: BUG-1 through BUG-7, BUG-12, BUG-13, BUG-14 (admin tarafinda)

### High (4 admin + 1 jury = 5 bug)

H1–H4: BUG-8 through BUG-11 (admin display issues)
H5: JURY-BUG-1 (hardcoded total — gelecek risk, simdiki haliyle calisiyor)

### Medium (2 jury)

M1: JURY-BUG-2 (dead outcomeConfig code temizligi)
M2: JURY-BUG-3 (criteriaConfig vs effectiveCriteria param fragility)
