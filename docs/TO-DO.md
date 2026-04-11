# VERA — TODO

Bu dosya aktif TODO'ları takip eder. Memory'den derlenen ve kodla
doğrulanan durumlar `✅ DONE` ile işaretli; kalanlar `⏳ PENDING`.

---


### ✅ Approve Application Flow — Düzeltildi

`030_fix_approve_application.sql` (her iki DB'ye uygulandı). RPC artık
`auth.users`'dan email ile user'ı bulup `profiles` + `memberships` insert
ediyor. `membership_created` flag'i response ve audit log'da mevcut.

---

## 🟡 Yakın Vade (MVP)

### Icon Tooltip Audit

Tüm ikon butonlarının `title` attribute'u veya custom tooltip'i olmalı.
Native `title` browser tooltip'i kabul edilmez (premium SaaS kuralı) —
uygulama genelinde tutarlı bir custom tooltip bileşeni kullanılacak.

- [ ] Tüm ikon butonları taranacak (admin panel, jury flow, drawers, modals)
- [ ] Native `title` attribute'lar kaldırılacak, custom tooltip bileşeniyle değiştirilecek
- [ ] Tooltip bileşeni: hover delay, placement (top/bottom/left/right), dark mode uyumlu
- [ ] Kontrol listesi: Trash, X, Edit, Copy, Download, Approve, Reject, Lock, Revoke ikonları

---

### Self-Serve Organization Creation

Kullanıcıların Super Admin onayı beklemeden kendi organizasyonlarını
oluşturabilmesi. Şu an register formunda sadece "mevcut org'a başvur"
seçeneği var; hackathon/competition gibi hızlı kurulum gereken senaryolar
için ağır kalıyor.

**MVP (~1 gün):**

- [ ] Register formuna toggle ekle: "Join existing" / "Create new"
- [ ] "Create new" form alanları: org adı, kurum, kod, kısa açıklama
- [ ] Yeni RPC: `rpc_self_serve_create_org`
  - Tek transaction'da: org insert + membership insert (`org_admin`)
  - Status: `active` (MVP için; trial v2'de)
  - Email verified kontrolü
- [ ] Org code unique kontrolü + kullanıcı dostu hata mesajı
- [ ] Aynı email için maksimum org limiti (spam koruması)
- [ ] Super Admin dashboard'una "New orgs (last 7 days)" kartı
- [ ] İlk giriş onboarding hint: "Create your first Evaluation Period"

**Karar verilmesi gerekenler (ürün):**

- Trial mi, sınırsız mı?
- Org code: auto-generate mi, kullanıcı girsin mi?
- Mevcut "başvuru + onay" akışı kalacak mı, silinecek mi, opsiyonel mi?
- Yeni org'lar için moderasyon: otomatik active mi, "unverified" badge mi?

### Period Templates — Platform-Provided Framework Scaffolds

Şu an `AddEditPeriodDrawer`'daki tek seçenek **geçmiş bir period'dan kopyalamak**
([AddEditPeriodDrawer.jsx:260-272](src/admin/drawers/AddEditPeriodDrawer.jsx#L260-L272)).
İlk period'u oluşturan tenant admin için sıfırdan kurmak zorunda. Bunun
yerine platform-provided MÜDEK / ABET template'leri seçilebilmeli.

**Hedef dropdown yapısı:**

```text
📋 Platform Templates
  ├─ MÜDEK 2024 — 4 criteria, 11 outcomes
  └─ ABET EAC 2026-2027 — 4 criteria, 7 outcomes

📅 Previous Periods
  ├─ Spring 2026
  └─ Fall 2025

✨ None — start fresh
```

**Kapsam:**

- [ ] `docs/abet-outcomes.md` yazılacak — verbatim EAC 2026-2027 Student
      Outcomes 1–7 (PDF: `https://www.abet.org/wp-content/uploads/2025/12/2026-2027_EAC_Criteria.pdf`)
- [ ] Migration: `frameworks` tablosuna `default_period_config JSONB` kolonu
      (`{criteria, rubrics, outcome_mappings}` preset)
- [ ] Migration: MÜDEK + ABET'i global framework olarak seed
      (`organization_id = NULL`) — mevcut demo seed'deki ABET satırı
      `organization_id = 'b94595d6-…'` scope'unda ve paraphrased CAC
      metinleri kullanıyor, bu yeni global satırlar EAC'in verbatim
      metinleriyle ayrı kayıt olacak
- [ ] `AddEditPeriodDrawer`: "Copy Criteria From" → "Start From" grouped
      select (Platform Templates + Previous Periods + None)
- [ ] `rpc_admin_period_create` (veya eşdeğeri): `templateFrameworkId`
      parametresi eklenecek; template seçilirse `default_period_config`
      deserialize edilip `criteria_config`'e **snapshot** olarak yazılacak
      (live reference değil — framework sonradan değişse bile period
      tutarlı kalmalı)
- [ ] Her iki DB'ye uygula (vera-prod + vera-demo)

**Karar verilmesi gerekenler:**

- Template seçimi zorunlu mu (ilk period için), opsiyonel mi?
- Mevcut demo seed'deki ABET satırı (CAC/paraphrased) kalsın mı, global
  EAC ile değiştirilsin mi?
- Framework'ün `default_period_config` JSONB şeması nasıl versiyonlansın
  (gelecekte şema değişirse)?

---

### Dynamic Insight Banners — Analytics

Prototype'taki "6 of 8 outcomes met" gibi insight metinleri şu an statik
olabilir — implementasyonda dinamik hesaplama doğrulanmalı.

- [ ] Analytics insight banner'ları gerçek verden mi hesaplanıyor kontrol
- [ ] `metCount`, `totalOutcomes`, `regressionList` computed değerler
- [ ] Hardcoded metin kaldıkça dinamik hale getir

---

### Landing Page — JSONB Content

Landing page içeriği (stats, testimonials, showcase slides, FAQ,
comparison table) şu an component'lerde hardcoded. JSONB storage'a
taşınarak admin tarafından güncellenebilir olmalı.

- [ ] `landing_content` tablosu veya `organizations.landing_config` JSONB
- [ ] Migration: landing içerik tablosu + seed
- [ ] Component'leri prop-driven hale getir (hardcode kaldır)
- [ ] Super admin panelinden düzenleme UI'ı (opsiyonel — API first)

---

## 🔵 v2.0 Roadmap

### Türkçe Dil Desteği (i18n)

Tüm UI metinlerinin Türkçe/İngilizce arasında geçiş yapabilmesi.
Özellikle Türkiye'deki kurumsal kullanıcılar için kritik.

**Kapsam:**

- [ ] i18n kütüphanesi seç (`react-i18next` önerilir)
- [ ] `src/locales/tr.json` ve `src/locales/en.json` çeviri dosyaları
- [ ] Jury flow metinleri (adım başlıkları, butonlar, hata mesajları)
- [ ] Admin panel metinleri (tab adları, tablo başlıkları, form etiketleri)
- [ ] Email şablonları — TR/EN variant (invite, password reset, bildirimler)
- [ ] Dil tercihi: per-org ayarı (org admin seçer) veya per-user
- [ ] `organizations` tablosuna `locale` kolonu (`'tr'` | `'en'`, default `'en'`)
- [ ] Aktif dil: URL param (`?lang=tr`) veya kullanıcı ayarı → sessionStorage
- [ ] Juror flow: entry token'dan org'a bakarak dil otomatik ayarlansın
- [ ] Tarih/sayı formatları locale'e göre (`tr-TR` Intl)
- [ ] DB migration: `organizations.locale` kolonu

**Karar verilmesi gerekenler:**

- Dil seçimi kullanıcı bazında mı, org bazında mı, her ikisi de mi?
- Super admin paneli sadece İngilizce mi kalacak?
- Email şablonları org locale'e göre mi gönderilecek?

---

### Self-Serve Org v2

- [ ] Trial / freemium modeli (14 gün trial veya max N proje)
- [ ] Domain verification (`@metu.edu.tr` → auto-trust)
- [ ] Kullanıcının kendi org'unu silme/arşivleme
- [ ] Billing entegrasyonu

---

### Legal & Compliance — ToS + Privacy Policy

Her SaaS'ta zorunlu olan Terms of Service + Privacy Policy altyapısı.
KVKK/GDPR uyumluluk için regülasyon gerekliliği; ilk paying customer
geldiğinde tamamlanmalı.

**Önce yapılması gerekenler (ürün/legal, geliştirici değil):**

- [ ] Avukatla oturup ToS + Privacy Policy metinlerini hazırla
      (KVKK + GDPR uyumlu, veri saklama süreleri, veri sahibi hakları)
- [ ] Türkiye hosting + data residency detayları netleştir

**Implementation kapsamı:**

- [ ] Landing site'a `/legal/terms` ve `/legal/privacy` route'ları ekle
      (içerik markdown veya JSONB'den render)
- [ ] Migration: `platform_settings` tablosuna `legal_tos_url` ve
      `legal_privacy_url` TEXT kolonları
- [ ] Global Settings drawer'ına "Legal & Compliance" section + iki
      URL input alanı
- [ ] RegisterForm'da "I agree to Terms & Privacy" checkbox (zorunlu)
      — link'ler settings'ten gelecek
- [ ] Landing page footer'ına Terms / Privacy link'leri
- [ ] E-posta template footer'larına Terms / Privacy link'leri ekle
      (notify-application, password-reset, invite-org-admin vb.)

**Örnek referanslar:** Notion, Linear, Typeform footer yapıları.
