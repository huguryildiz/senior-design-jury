# VERA Production Readiness Audit Report

**Date:** 2026-03-15
**Scope:** Full codebase review — frontend, backend RPCs, Edge Function, tests, styles, accessibility
**Context:** Internal university tool for EE 491/492 poster-day evaluations. Used ~2-3 days/year.

---

## 1. Final Verdict

### Kucuk sorunlarla production'a hazir

VERA, kucuk olcekli bir universite ici sistem olarak temel islevlerini
guvenilir sekilde yerine getiriyor. Jury akisi saglamdir, veri butunlugu
mekanizmalari (deduplication, normalization, visibility autosave) dusunulmus
ve uygulanmistir. Tespit edilen sorunlarin cogu edge-case senaryolaridir ve
normal kullanim kosullarinda karslasilma olasiligi dusuktur. Ancak birkac
orta seviye sorun, production oncesi gozden gecirilmelidir.

---

## 2. Guclu Yonler

### Veri Butunlugu Mimarisi

- `writeGroup` + `buildScoreSnapshot` + `lastWrittenRef` deduplication
  mekanizmasi iyi tasarlanmis. Her yazma islemi once normalize eder, sonra
  snapshot key karsilastirir — gereksiz API cagrilari onlenir.
- `pendingScoresRef` / `pendingCommentsRef` pattern'i, React render
  cycle'dan bagimsiz olarak her zaman en guncel veriyi okumaya izin verir.
- `onBlur` → `writeGroup`, navigation → `writeGroup`, `visibilitychange` →
  `writeGroup` uclu kaydetme stratejisi mobil ve masaustu icin saglamdir.

### API Katmani Tasarimi

- `src/shared/api.js` tek giris noktasi olarak tum Supabase cagrilarini
  merkezi yonetiyor.
- Field name mapping (`design` ↔ `written`, `delivery` ↔ `oral`) SADECE
  API katmaninda yapiliyor — UI ve state katmanlarina sizmiyor.
- `withRetry` sadece transient network hatalarinda tekrar deniyor;
  `AbortError` ve business error'lari asla tekrarlamaz.
- Production'da admin RPC'ler Edge Function proxy uzerinden gidiyor —
  `rpc_secret` tarayiciya ulasmaz.

### Guvenlik Onlemleri

- Admin sifresi `useRef` ile tutuluyor (React state'te degil —
  DevTools'da gorunmez).
- RLS tum tablolarda aktif (default deny).
- PIN'ler bcrypt ile hashleniyor (`gen_salt('bf')`).
- Audit log'lar immutable trigger ile korunuyor — guncelleme/silme
  engellenmis.
- Brute force korumalari mevcut: admin 5 deneme / 15 dk, juror 3 deneme /
  15 dk.

### Kod Organizasyonu

- `config.js` tek kaynak olarak kriteria, MUDEK ciktilari ve renk skalasini
  tanimliyor.
- `ErrorBoundary` ayri ayri JuryForm ve AdminPanel'i sariyor.
- `scoreHelpers.js` saf fonksiyonlar olarak cikarilmis — test edilebilirlik
  yuksek.
- `qaTest` pattern'i ile test-catalog eslesmesi tam: 160 qaTest girisi = 160
  test.

### Test Kalitesi

- 244 test, tumu basarili.
- Jury scoring akisi icin kapsamli testler: normalization, deduplication,
  auto-done trigger, edit mode, lock state.
- CSV import validation icin 10 adet edge-case testi.
- a11y testleri axe-core ile ScoringGrid ve PinRevealStep'i kapsiyor.

---

## 3. Kalan Sorunlar

### CRITICAL

#### C1. Visibility change autosave hata durumunda sessizce basarisiz oluyor

**Dosya:** `src/jury/useJuryState.js:521-531`

```javascript
const onVisibilityChange = () => {
  if (document.visibilityState === "hidden" && step === "eval") {
    const pid = projs[cur]?.project_id;
    if (pid) writeGroup(pid); // hata yakalanmiyor
  }
};
```

`writeGroup` basarisiz olursa (network kesintisi), kullanici bilgilendirilmez
ve veri kaybedilir. Kullanici sekmeyi kapatirsa ve son duzenleme
kaydedilmediyse, kurtarma mekanizmasi yoktur.

**Etki:** Dusuk olasilik ama yuksek sonuc — kullanici verisi sessizce
kaybolabilir.

**Oneri:** `writeGroup` hatasini yakalayip `localStorage` uzerinden
`pendingScoresRef` snapshot'i saklayarak sonraki oturumda kurtarma imkani
saglanmali.

---

#### C2. SettingsPage (admin) icin test kapsamasi cok dusuk

**Dosya:** `src/admin/SettingsPage.jsx` (2097 satir)

Bu dosya tum yonetici islemlerini iceriyor: semester/proje/juror silme, eval
lock, PIN reset, export/import. Hicbirinin unit testi yok. Destructive
operasyonlar (silme) icin test olmasi, production'da regression riski
olusturuyor.

**Etki:** Herhangi bir refactoring veya bugfix, fark edilmeden admin
islemlerini kirabilir.

**Oneri:** En azindan delete, lock toggle ve PIN reset operasyonlari icin
testler yazilmali.

---

#### C3. `handleConfirmSubmit` icinde `finalizeJurorSubmission` basarisizlik durumu eksik test edilmis

**Dosya:** `src/jury/useJuryState.js:456-492`

`finalizeJurorSubmission` basarisiz oldugunda `submitPendingRef` sifirlanir ve
kullanici tekrar submit edebilir. Bu, DB tarafinda kismi basari durumunda
tutarsizliga yol acabilir. Test suite'te bu path hic test edilmemis.

**Etki:** Potansiyel cift submission veya tutarsiz state.

---

### MEDIUM

#### M1. `handleScore` ham (normalize edilmemis) deger olarak state'e kaydediyor

**Dosya:** `src/jury/useJuryState.js:365-381`

`handleScore` raw string'i `pendingScoresRef`'e yaziyor. Normalization sadece
`handleScoreBlur` veya `writeGroup` icindeki `buildScoreSnapshot`'ta
yapiliyor. Bu tasarim dogru calisiyor cunku `writeGroup` her zaman normalize
eder, ancak `handleNavigate` arasinda blur event'i fire etmeden gecis yapmak
teorik olarak un-normalized snapshot key olusturabilir.

**Gercekte:** `writeGroup` icindeki `buildScoreSnapshot` bu durumu handle
ediyor — normalize ederek yazar. Veri butunlugu korunuyor. Ancak `groupSynced`
flag'i yanlis kalabilir.

**Etki:** Dusuk — veri kaybi yok, ama UI sync gostergesi yaniltici olabilir.

---

#### M2. Admin realtime subscription dependency'leri eksik

**Dosya:** `src/AdminPanel.jsx:588-611`

Realtime channel subscription sadece `[adminPassState]` dependency'sine bagli.
Semester degisikligi subscription'i tetiklemiyor — kullanici aktif semester'i
degistirdikten sonra eski semester'in event'lerini dinlemeye devam edebilir.

**Etki:** Realtime guncellemeler yanlis semester verisi gosterebilir.

---

#### M3. SettingsPage realtime subscription callback referanslari her renderda yeniden olusturuluyor

**Dosya:** `src/admin/SettingsPage.jsx:819-826`

`applySemesterPatch`, `applyProjectPatch` gibi callback'ler `useCallback`
olmadan dependency array'e eklenmis. Her renderda yeni referans →
subscription surekli yeniden kurulur.

**Etki:** Gereksiz subscription churn, potansiyel performans sorunu ve event
kaybi.

---

#### M4. Admin detay gorunumunde async cancellation eksik

**Dosya:** `src/AdminPanel.jsx:825-864`

`finally` blogu `cancelled` flag'i kontrol etmeden `setDetailsLoading(false)`
cagiriyor. Hizli mount/unmount durumunda unmounted component'e state
yazilabilir (React 18'de uyari vermez ama mantiksal hata).

**Etki:** Dusuk — React 18 bunu tolere eder, ama best practice degil.

---

#### M5. CORS konfigurasyonu `ALLOWED_ORIGINS` ayarlanmadiyinda wildcard'a dusuyor

**Dosya:** `supabase/functions/rpc-proxy/index.ts:12-20`

`ALLOWED_ORIGINS` env variable'i set edilmediginde CORS header `"*"` olarak
donuyor. Ayrica `!origin` kontrolu Origin header'i olmayan requestlere izin
veriyor.

**Etki:** Uretimde CORS bypass riski. ALLOWED_ORIGINS set edilmisse risk yok,
ama konfigurasyona bagiml.

---

#### M6. `outline: none` CSS kurallari focus gostergesini kaldiriyor (38+ instance)

**Dosyalar:** `src/styles/admin-details.css`, `admin-manage.css`,
`admin-jurors.css`, `admin-dashboard.css`

Bircok form elementi ve buton `outline: none` ile focus gostergesini kaldiriyor
ama alternatif `:focus-visible` stili saglamiyor. WCAG 2.1 Level AA
(2.4.7 Focus Visible) ihlali.

**Etki:** Klavye kullanicilari hangi elementin odakta oldugunu goremez.

---

#### M7. Dialog bilesenlerinde focus trap uygulanmamis

**Dosya:** `src/admin/settings/PinResetDialog.jsx`

`aria-modal="true"` ve `role="dialog"` mevcut, ancak:

- Tab tusunun dialog disindan kacirilmamasini saglayan focus trap yok
- Dialog acildiginda ilk odak yonetimi belirsiz
- Escape tusu ile kapatma davranisi belgelenmemis

**Etki:** Ekran okuyucu ve klavye kullanicilari icin erisebilirlik sorunu.

---

### MINOR

#### m1. `teduLogo` import'u App.jsx'te kullanilmiyor

**Dosya:** `src/App.jsx:34`

`import teduLogo from "./assets/tedu-logo.png"` import edilmis ama
kullanilmiyor. Satir 428'de hardcoded path kullaniliyor.

#### m2. `STORAGE_KEYS` tanimlanmis ama sadece `clearLocalSession`'da kullaniliyor

**Dosya:** `src/jury/useJuryState.js:41-46`

`clearLocalSession` callback'i jury bilesenlerinden cagirilmiyor — dead code.

#### m3. `ALLOWED_EXTRAS` icindeki `rpc_bootstrap_admin_password` redundant

**Dosya:** `supabase/functions/rpc-proxy/index.ts:44-46`

Bu fonksiyon zaten `rpc_admin_` prefix kontrolunden geciyor. Ayrica gercek
fonksiyon adi `rpc_admin_bootstrap_password` — `rpc_bootstrap_admin_password`
hicbir yerde cagirilmiyor.

#### m4. `VITE_DEMO_MODE` ve `VITE_DEMO_ADMIN_PASSWORD` belgelenmemis

**Dosya:** `src/App.jsx:36-37`

Demo modu feature flag olarak mevcut ama `.env.local` orneginde veya
CLAUDE.md'de dokumente edilmemis.

#### m5. Tutarsiz hata mesaji formati (jury akisi)

**Dosya:** `src/jury/useJuryState.js:637-693`

Bazi hata mesajlari "Please..." ile bitiyor, bazilari dogrudan bildirim
veriyor. Tutarlilik sorunu.

#### m6. Z-index catismalari

**Dosyalar:** `shared.css`, `admin-layout.css`, `admin-matrix.css`

Birden fazla eleman `z-index: 9999` kullaniyor — `.skip-link`,
`.admin-checking-overlay`, matrix elemanlari. Birden fazla overlay acikken
katmanlama sorunu yasanabilir.

#### m7. `!important` asiri kullanimi (89+ instance)

**Dosyalar:** `jury.css`, `admin-matrix.css`, `admin-responsive.css`

Print media'daki kullanim kabul edilebilir, diger yerlerdeki kullanim CSS
bakim zorlugu olusturuyor.

#### m8. Bazi butonlarda `tabIndex={-1}` — klavye erisimi engelleniyor

**Dosya:** `src/jury/PinStep.jsx:129` (PIN goster/gizle butonu)

Fonksiyonel bir buton klavyeyle ulasilamaz hale getirilmis.

---

## 4. Risk Notlari

### Proje olcegi icin kabul edilebilir trade-off'lar

| Trade-off | Neden kabul edilebilir |
|---|---|
| React Router yok, state-based routing | URL paylasimi gerekmiyor; 3 sayfalik uygulama |
| Admin sifresi her RPC'de parametre olarak gonderiliyor | Session/JWT karmasikligi gereksiz; HTTPS zorunlu |
| Cache yok, her tab degisiminde veri yeniden cekilir | Canli degerlendirme gunu taze veri gerektiriyor |
| TypeScript yok | 244 test + kucuk ekip; tip guvenliginin getirisi sinirli |
| E2E testler CI'da devre disi | Izole test DB henuz yok — bilinir durum |
| Chart bilesenleri test edilmemis | Sadece gorsellestirme, is mantigi yok |
| 4 haneli PIN (10.000 kombinasyon) | Rate limiting + lockout mevcut; fiziksel ortamda kullanim |
| bcrypt PIN icin (yeterli ama fazla) | Zaten guvenli; degistirme gerekliligi yok |

### Dikkat edilmesi gereken riskler

| Risk | Olasilik | Etki | Azaltma |
|---|---|---|---|
| Visibility change'de sessiz veri kaybi | Dusuk | Yuksek | localStorage fallback ekle |
| Admin islemlerinde regression (test yok) | Orta | Yuksek | SettingsPage testleri yaz |
| CORS wildcard production'da | Dusuk | Orta | ALLOWED_ORIGINS zorunlu yap |
| Focus gorunurlugu eksikligi | Kesin | Dusuk-Orta | `outline: none` kurallarini duzenle |
| Realtime subscription churn | Orta | Dusuk | Callback'leri `useCallback` ile sar |

---

## 5. Test Guveni

### Genel Durum

- **244 test**, tumu basarili
- **qaTest pattern** tutarli: 160 catalog girisi = 160 test
- Jury scoring akisi icin guven yuksek

### Kapsamli Test Edilen Alanlar (Yuksek Guven)

- Skor giris, normalization, clamping
- `writeGroup` deduplication mantigi
- Auto-done trigger ve `justLoadedRef` guard
- PIN attempt tracking ve lockout
- CSV import validation (10 edge case)
- `isScoreFilled`, `countFilled` saf fonksiyonlar
- Score grid ARIA attribute'lari (a11y)

### Yetersiz Test Edilen Alanlar (Dusuk Guven)

| Alan | Mevcut | Eksik |
|---|---|---|
| `finalizeJurorSubmission` success path | Mock only | Gercek cagirim testi |
| Admin delete islemleri | Yok | Tum destructive op'ler |
| Admin eval lock toggle | Yok | Lock/unlock cycle |
| Admin PIN reset | Render testi | Gercek reset mantigi |
| Admin export/import | Yok | Corrupt backup durumu |
| Edit mode → re-submit cycle | Kismi | Tam cycle testi |
| Network hatasi sirasinda submit | Yok | Timeout/retry davranisi |
| SettingsPage state management | Yok | 2097 satirlik dosya, 0 test |

### Kor Noktalar

1. **Jury finalization:** `handleConfirmSubmit → finalizeJurorSubmission →
   step="done"` path'i hic test edilmemis
2. **Admin destructive ops:** Silme, lock, PIN reset operasyonlari icin sifir
   test
3. **Realtime subscription:** Gelen event'lerin dogru isle islenmesi test
   edilmemis
4. **Concurrent saves:** Birden fazla `writeGroup` cagrisinin ayni anda
   calismasi test edilmemis

---

## 6. Final Deployment Checklist

### Production Oncesi Zorunlu

- [ ] `ALLOWED_ORIGINS` env variable'inin production Edge Function'da dogru
      set edildigini dogrula
- [ ] `rpc_secret` Supabase Vault'ta tanimli ve bos olmadigini dogrula
- [ ] Admin password'un guclu oldugunu dogrula (en az 20 karakter)
- [ ] `.env.local` dosyasinin `.gitignore`'da oldugunu dogrula (mevcut: evet)
- [ ] `VITE_DEMO_MODE` production build'de `false` veya undefined oldugunu
      dogrula
- [ ] `npm run build` basariyla tamamlandigini dogrula
- [ ] `npm test -- --run` tum testlerin gectigini dogrula
- [ ] Supabase tablolarinda RLS enabled oldugunu dogrula
- [ ] Audit log immutability trigger'inin aktif oldugunu dogrula
- [ ] Production Supabase'de legacy plaintext PIN kalmamis olmali

### Production Oncesi Onerilen

- [ ] Visibility change autosave hatasina catch + localStorage fallback ekle
- [ ] `outline: none` kurallarini `:focus-visible` alternatifiyle degistir
      (en azindan jury akisi)
- [ ] SettingsPage icin en az 3 temel test yaz (delete, lock, PIN reset)
- [ ] `finalizeJurorSubmission` icin bir success ve bir failure testi yaz
- [ ] CORS wildcard fallback'i kaldir — `ALLOWED_ORIGINS` zorunlu yap

### Post-Launch Izleme

- [ ] Ilk kullanim gununde Supabase Dashboard'dan RPC hata oranini izle
- [ ] Audit log'larda beklenmedik `admin_delete` veya `eval_lock` kaydi
      kontrol et
- [ ] Jury submit islemi sonrasi `final_submitted_at` alanlarinin dogru dolup
      dolmadigini dogrula

---

## 7. Puanlama Tablosu

| Alan | Puan (1-10) | Siniri | Yukari Tasinmasi Icin |
|---|---|---|---|
| **Security** | 7 | PIN plaintext donusu, CORS wildcard fallback, dev-mode secret client bundle'da | CORS strict enforce, PIN return kaldir, exponential backoff |
| **Reliability / Data Integrity** | 8 | Visibility change sessiz hata, finalize failure state | localStorage fallback, finalize retry mantigi |
| **Accessibility** | 5 | 38+ `outline:none`, focus trap yok, sinirli a11y testi | Focus gostergeleri, dialog focus trap, daha fazla axe-core test |
| **Performance** | 8 | Realtime subscription churn, memo cascade | useCallback sarmalama, subscription stabilize |
| **Architecture / Code Quality** | 8 | SettingsPage 2097 satir, ref-agirlikli state yonetimi | SettingsPage bolunmesi, optional useReducer |
| **Test Coverage** | 6 | Admin ops 0 test, finalize untested, 0 chart test | SettingsPage testleri, finalize path, E2E |
| **Maintainability** | 7 | CLAUDE.md iyi, ama demo mode belgelenmemis, dead code var | Demo mode dokumantasyonu, dead code temizligi |

### Overall Score: 7.0 / 10

Bu puan, kucuk olcekli internal production sistemi standardina goredir. Jury
akisi ve veri butunlugu mekanizmalari gucludur (8+), ancak admin tarafinin
test eksikligi (6), erisebilirlik sorunlari (5) ve birkac guvenlik ince
noktasi genel puani dusurus unsuru olmustur.

**7 → 8 icin:** SettingsPage testleri + focus visible duzeltmeleri + CORS
strict enforcement

**8 → 9 icin:** E2E testler CI'da, tum dialog'larda focus trap, admin panel
error boundary'leri, SettingsPage modularizasyonu

---

Bu rapor, 2026-03-15 tarihinde mevcut kod tabani uzerinden bagimsiz olarak
uretilmistir.
