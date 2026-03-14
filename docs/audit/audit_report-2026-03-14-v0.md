# TEDU Capstone Portal — Senior Frontend Audit Report

**Auditor perspective:** Senior Product Engineer / Frontend Auditor
**Date:** 2026-03-14
**Codebase size:** ~40+ kaynak dosya, React 18 + Vite + Supabase


# Önce Genel Mimari Gözlemler (Tüm Puanları Etkiler)

Puanlamaya geçmeden, skorları doğrudan etkileyen mimari kararları not etmek gerekiyor:

| Karar | Değerlendirme |
| --- | --- |
| State-based routing (React Router yok) | Kırmızı bayrak. Deep link yok, tarayıcı geri tuşu bozuk, bookmark yok. |
| Charts.jsx — 91KB tek dosya | Code smell. 7 farklı chart tipi tek dosyada. |
| Admin password her RPC'ye parametre olarak gönderiliyor | Session tabanlı auth yerine stateless password passing. |
| Supabase RPC için sıfır önbellekleme | Her tab değişiminde fresh fetch. |
| AdminPanel → children prop drilling | Context veya state lib yok, derinleştikçe riskli. |
| 4-digit PIN | Rate limiting var ama 4 hane semantik olarak zayıf. |
| useRef for admin password | Doğru güvenlik kararı ama yetersiz session management'ı gizliyor. |

# ADMIN PANEL


## 1. Settings

`src/admin/SettingsPage.jsx / ManageSemesterPanel.jsx / ManageProjectsPanel.jsx / ManageJurorsPanel.jsx`


| Kriter | Puan | Not |
| --- | --- | --- |
| Functional correctness | 7/10 | CRUD çalışıyor, CSV import var, DnD var. ManagePermissions az incelendi, bilinmeyenler var. |
| UI quality | 6/10 | 4 panel üst üste accordion — vizüel hiyerarşi zayıf. Aktif panel ile pasif panel arasında yeterli kontrast yok. |
| UX clarity | 5/10 | Kaydedilmemiş değişiklik uyarısı yok. Formu doldurup yanlış paneli kapatsan veri kaybolur. |
| Mobile usability | 4/10 | Juror listesi, CSV import, DnD — bunların tamamını mobilde kullanmak neredeyse imkânsız. |
| Performance | 7/10 | Hafif bileşenler, ama her panel aç/kapat full re-render. |
| Accessibility | 5/10 | Form label'ları var ama accordion keyboard nav eksik, DnD aksesibilite iyi değil. |
| Code quality | 5/10 | 4 ayrı panel benzer CRUD kalıplarını tekrarlıyor. normalizeStudents(), normalizeKey() gibi utilities extract edilmiş — iyi. Ama her panel kendi panelError state'ini yönetiyor, ortak error pattern yok. |
| Production readiness | 6/10 | CSV import hata UX'i belirsiz. DnD persistence davranışı edge case'li. |

**What works well:**


- CSV import akışı var; admin sıfırdan import edebiliyor.
- DnD öğrenci sıralama (@dnd-kit) — iyi bir UX kararı.
- Semester silme öncesi confirmation dialog.
- normalizeStudents() ile birden fazla separator formatını desteklemesi.
- Juror lock status'unu Settings'de gösterme.

**Main weaknesses:**


- Unsaved change guard yok. Form ortasında navigasyon → veri kaybı. Bu en büyük risk.
- 4 panel, aynı sayfada aynı anda açılabilirse görsel kaos. Kapalı mı açık mı belli değil yeterince.
- CSV import: parse hatası olduğunda satır bazlı hata mesajı var mı? Muhtemelen genel bir hata yeterli değil.
- ManagePermissionsPanel az belgelenmiş — eğer juror edit lock'u buradan yönetiliyorsa kritik bir flow'dur.

**Real user risks / edge cases:**


- Admin bir juror'ı silerken o juror aktif değerlendirmedeyse ne olur? Cascade delete var mı?
- Semester silerken içindeki tüm score'lar kaybolur mu? Kullanıcıya gösterilmiyor.
- CSV import: 2 satırlık juror ile 200 satırlık juror aynı UX ile karşılanıyor — progress feedback yok.

**What should be improved first:**


- Unsaved change guard (her panelde isDirty state + leave confirmation).
- Silme işlemlerinde cascade etki açıkça gösterilmeli.
- CSV import'ta satır bazlı validation ve hata özeti.

## 2. Admin / Scores / Rankings

`src/admin/RankingsTab.jsx`


| Kriter | Puan | Not |
| --- | --- | --- |
| Functional correctness | 8/10 | Sıralama, search, export çalışıyor. Virtualization 40+ grup için aktif. |
| UI quality | 7/10 | Medal badge'ler iyi. Mini bar chart entegrasyonu hoş. Ama rank card layout yoğun bilgi taşıyor. |
| UX clarity | 7/10 | Sort seçenekleri açık. Expandable project details iyi. Ama "sort by criterion" dropdown ne kadar keşfedilebilir? |
| Mobile usability | 6/10 | Rank card'lar mobilde sığdırılabilir ama mini bar chart'lar muhtemelen çok küçük. |
| Performance | 7/10 | Virtualization var — iyi. Export XLSX senkron mu asenkron mu? Büyük veri setinde UI donabilir. |
| Accessibility | 5/10 | Bar chart'ların aksesibil alternatifi var mı? Muhtemelen yok. |
| Code quality | 7/10 | İyi modülerleştirilmiş. Export ayrı utility. |
| Production readiness | 7/10 | Ürün benzeri hissettiriyor ama chart aksesibilitesi eksik. |

**What works well:**


- Virtualization kararı doğru — 40+ grup için performans düşünülmüş.
- Medal sistemli top-3 görselleştirme anlamlı.
- Per-criterion mini bar chart — juror'ların nasıl farklılaştığını gösteriyor.

**Main weaknesses:**


- Sort criteria listesi ne kadar uzun? Criterion sayısı * 2 (asc/desc) + genel seçenekler → 10+ seçenek karmaşık.
- XLSX export büyük veri setlerinde ana thread'i blokluyor olabilir.

**Real user risks / edge cases:**


- Hiç submission yok → boş state, ama "0 group scored" ile "data loading" arasındaki fark net mi?
- Tüm juror'lar partial submission yaptıysa avg nasıl hesaplanıyor? Partial dahil mi?

**What should be improved first:**


- Chart'lar için <caption> veya data table alternatifi.
- Export async wrapper veya web worker.

## 3. Admin / Scores / Analytics

`src/admin/AnalyticsTab.jsx / src/Charts.jsx`


| Kriter | Puan | Not |
| --- | --- | --- |
| Functional correctness | 7/10 | 7 chart tipi var ve hepsi veri üretiyor. MÜDEK threshold line — doğru domain kararı. |
| UI quality | 6/10 | Chart'lar bilgi-yoğun. Biri diğerinden güzel, tutarsız padding/boyut. |
| UX clarity | 5/10 | 7 chart türü = bilişsel yük fazla. Hangi chart'tan ne çıkarılacağı açıkça yazılmamış. Competency Radar + Box Plot + Heatmap yan yana durunca kim ne bakacak bilmiyor. |
| Mobile usability | 3/10 | Radar chart, box plot, heatmap — mobilde kullanılabilir değil. Responsive fallback yok. |
| Performance | 4/10 | Charts.jsx = 91KB tek dosya. Lazy loading yapılmadıysa analytics tab açılmadan bu dosya yükleniyor. PDF export'ta ne kullanılıyor? Belli değil ama ağır olabilir. |
| Accessibility | 2/10 | Charts'lar SVG/canvas — alt text, ARIA role, data table alternatifi muhtemelen yok. WCAG için fail. |
| Code quality | 3/10 | 91KB tek dosya en büyük code smell. Her chart component ayrı dosya olmalı. Split edilmeden maintain edilemez. |
| Production readiness | 5/10 | Feature-rich ama performance ve accessibility açıkları ciddi. |

**What works well:**


- MÜDEK outcome mapping ve threshold line — domain'e özgü, doğru karar.
- Outcome Trend (tarihsel karşılaştırma) — birden fazla dönemi karşılaştırma iyi feature.
- Juror Consistency Heatmap — varyans analizi için değerli.

**Main weaknesses:**


- 91KB monolith en büyük problem. Yeni chart eklemek bu dosyayı daha da büyütüyor.
- 7 chart tipi için açıklama yok — admin her chart'ta ne bakacağını bilmek zorunda.
- Accessibility = 2/10. Engellilik yasal gereksinimleri açısından riskliyse (üniversite bağlamında olabilir) bu kritik.
- PDF export implementasyonu belirsiz — ağır kütüphane mi, print media query mi?

**Real user risks / edge cases:**


- adminGetOutcomeTrends ile birden fazla semester seçildiğinde — outlier veri noktası radar chart'ı bozar.
- Box plot tek juror olduğunda box'ı gösterecek kadar veri yok — graceful degradation var mı?

**What should be improved first:**


- Charts.jsx'i parçala. Her chart tipi = ayrı dosya.
- Dynamic import ile lazy load analytics tab.
- Her chart için minimum data table alternatifi ekle.
- Mobile fallback: küçük ekranda chart yerine tablo göster.

## 4. Admin / Scores / Grid

`src/admin/ScoreGrid.jsx`


| Kriter | Puan | Not |
| --- | --- | --- |
| Functional correctness | 8/10 | Sticky header + frozen column + sorting + filtering + tooltip + custom touch scroll — hepsi var. |
| UI quality | 7/10 | Cell state renklendirme (green/amber/gray) anlamlı. Status legend açıklayıcı. |
| UX clarity | 7/10 | Hover tooltip ile kriter breakdown'ı — iyi. Ama ilk bakışta grid okumak öğrenme gerektiriyor. |
| Mobile usability | 6/10 | Custom touch scroll — iyi niyet. Ama momentum implementasyonu native scroll kadar smooth olamaz. iPad için makul, telefon için tartışmalı. |
| Performance | 7/10 | useScrollSync ile iki scroll container sync'leniyor — dikkatli implementasyon. Ama büyük grid'lerde (50+ juror × 40+ grup) render sayısı? |
| Accessibility | 4/10 | Data grid için role="grid", aria-rowcount, aria-colcount gibi ARIA özellikleri muhtemelen eksik. Klavye ile grid navigasyonu? |
| Code quality | 7/10 | Hook'lara güzel ayrılmış: useGridSort, useScoreGridData, useScrollSync, useGridExport. |
| Production readiness | 7/10 | İyi feature density, ama accessibility açığı ciddiye alınmalı. |

**What works well:**


- Hook bazlı ayrışım (useGridSort, useScrollSync vb.) — iyi architecture.
- 5 juror durumu için renk-kodlu status legend.
- SWIPE_ACTIVATION_PX = 6 ile yanlışlıkla horizontal scroll aktifleşmesin diye threshold — düşünülmüş.

**Main weaknesses:**


- Custom touch momentum scroll native'in yerini tutmuyor. iOS Safari'de özellikle overflow-x: scroll + -webkit-overflow-scrolling: touch kullanmak daha iyi sonuç verirdi.
- Büyük veri setinde virtualization var mı? Rankings'te var ama Grid'de belli değil.
- Tooltip hover-only — touch cihazda kriter breakdown'ını görmek için ne yapılacak?

**Real user risks / edge cases:**


- 50+ juror × 50+ group = 2500 cell. Re-render performansı?
- Bir juror'ın adı çok uzunsa frozen column genişlerse tüm grid layout bozulur.

**What should be improved first:**


- Tooltip'e touch-tap desteği.
- Grid için temel ARIA role'leri.
- Virtualization kontrolü büyük veri setleri için.

## 5. Admin / Scores / Details

`src/admin/ScoreDetails.jsx`


| Kriter | Puan | Not |
| --- | --- | --- |
| Functional correctness | 8/10 | Çok kapsamlı filtre sistemi. LocalStorage persistence çalışıyor. XLSX export var. |
| UI quality | 6/10 | Excel-style filter panel bir tıkla açılıyor ama görsel olarak ağır. Aktif filtre sayısını göstermek yeterli mi? |
| UX clarity | 5/10 | 7+ farklı filtre tipi (text, numeric range, score status, juror status, date range) — öğrenme eğrisi yüksek. "Tüm filtreleri temizle" düğmesi ne kadar görünür? |
| Mobile usability | 4/10 | Bu kadar filtre mobilde kullanılabilir değil. Sortable table header'lar mobilde küçük tap target. |
| Performance | 7/10 | useMemo ile filtered list var muhtemelen. LocalStorage read/write her render değil umarım. |
| Accessibility | 5/10 | Filtre popup'ı Escape ile kapatılabiliyor — iyi. Ama filtre popover'ları focus trap'li mi? |
| Code quality | 7/10 | persist.js ile filter state localStorage'a yazılıyor — iyi isolation. parseDateString() ile çok format destekleniyor — savunmacı programlama. |
| Production readiness | 6/10 | Feature-rich ama filter UX sadeleştirilmeli. |

**What works well:**


- LocalStorage persistence — admin sayfayı yenilese filtreler korunuyor.
- Çok formatlı tarih parse — parseDateString() gerçekçi admin kullanımını düşünmüş.
- Juror status filter kombinasyonu Details'da mevcut — Rankings'te yok, burada var.

**Main weaknesses:**


- Filtre sisteminin öğrenme eğrisi yüksek. Yeni admin ilk kullandığında kaybolur.
- Aktif filtre göstergesi yeterli mi? "5 filtre aktif" gibi bir badge var mı?
- Date range filter ile "Bu hafta", "Bu ay" gibi shortcut'lar yok — manual giriş zahmetli.

**Real user risks / edge cases:**


- LocalStorage filter state çürür (eski semester'in filtresi yeni semester'de kalabilir) — semester switch'te filter temizleme var mı?
- XLSX export filtrelenmiş veriyi mi yoksa tümünü mü alıyor? Export öncesi açık gösterim yok.

**What should be improved first:**


- Filtre durumu özeti (badge sayısı).
- Semester değişiminde filter state reset.
- XLSX export scope'unu açıkça belirt ("X satır export ediliyor").

## 6. Admin / Overview

`src/admin/OverviewTab.jsx`


| Kriter | Puan | Not |
| --- | --- | --- |
| Functional correctness | 7/10 | 4 stat card + JurorActivity — temel metrikler var. |
| UI quality | 7/10 | Ring progress görsel — iyi seçim. Stat card'lar yeterince okunabilir. |
| UX clarity | 7/10 | Sayfa amacı açık. Ama "Completed Jurors" ne demek? Submit etmiş mi, başlamış mı? |
| Mobile usability | 7/10 | Stat card grid muhtemelen 2×2'e dönüşüyor mobilde — makul. |
| Performance | 8/10 | Hafif bileşen. Aggregated data, satır satır çekilmiyor. |
| Accessibility | 6/10 | Ring progress chart'ı için accessible label var mı? SVG'de <title> veya aria-label? |
| Code quality | 7/10 | StatCard component iyi abstraction. |
| Production readiness | 7/10 | Temel feature olarak production-ready en yakın yer burası. |

**What works well:**


- İlk tab olarak özet göstermek doğru UX kararı.
- Ring progress — tamamlanma durumunu sezgisel gösteriyor.
- JurorActivity komponenti — hangi juror'ın ne zaman aktif olduğunu görmek admin için değerli.

**Main weaknesses:**


- "Scored Evaluations" = kaç tane? Bu tam ne demek — toplam score satır sayısı mı, unique group × juror mı? Belirsiz.
- Son güncelleme zamanı yok — veriler ne zaman yüklendi belli değil.
- Empty state: hiç juror yoksa ne gösteriliyor? Onboarding promptu var mı?

**Real user risks / edge cases:**


- Yanlış semester seçilmişse tüm overview'lar 0 gösterir — yanıltıcı.
- "Refresh" düğmesi yok veya yetersiz konumda — admin veri güncel mi değil mi bilemiyor.

**What should be improved first:**


- Her stat card için tooltip ile tanım.
- Son veri güncelleme zamanı.
- Empty state ile onboarding akışı.

## 7. Admin Panel — Diğer Kritik Alanlar


#### Navigation / Tab Structure

**Puan: 6/10**


3 ana tab (Overview, Scores, Settings) + Scores içinde 4 sub-tab. Mantıksal hiyerarşi doğru.
Ama tab yapısı state-based routing ile yönetiliyor — URL'de görünmüyor. Bir admin "Analytics tab'ını paylaş" diyemez.
Sub-tab'lar hangi tab context'inde olduğunu görsel olarak yeterince gösteriyor mu?

#### Filtering / Sorting

**Puan: 7/10**


Details'da çok zengin, Rankings'te temel. Grid'de column-click sort.
Tutarsızlık: her tab'da farklı filter paradigması. Biri text box, biri dropdown, biri popup panel.

#### Import/Export Flows

**Puan: 6/10**


XLSX export 3 ayrı yerde, PDF export analytics'te, JSON backup full export.
CSV import juror ve proje için var.
Ama import preview yok (ne import edileceğini görmeden confirm etmek zorunda kalıyor).
Import sonucu özeti (kaç kayıt başarılı, kaç hata) net değil.

#### Lock/Unlock Flows

**Puan: 5/10**


Semester eval lock (rpc_admin_set_semester_eval_lock) var.
Juror edit mode (rpc_admin_set_juror_edit_mode) var.
Ama bu flow'ların UX'i belli değil — lock yaptığında juror ne görüyor? Mesaj var mı?
Lock durumu Overview'da gösteriliyor mu?

#### Semester Management

**Puan: 7/10**


CRUD tam. Active semester seçimi. Poster date ile bağlantılı.
Zayıf nokta: Birden fazla "active" semester olabilir mi? Guard var mı?

#### Juror Management

**Puan: 7/10**


CRUD, PIN reset, lock status, CSV import — kapsamlı.
PIN reset UX: yeni PIN admin'e mi gösteriliyor? Juror'a nasıl iletilecek?

#### Group/Project Management

**Puan: 6/10**


DnD ile student sıralama — iyi.
Ama grup numarası düzenlenebilir mi submission sonrası? Mevcut score'lar etkilenir mi?

# JURY FLOW


## 1. Landing / Entry (Home Page)

Home page tam incelenmedi ama mimari olarak:

| Kriter | Puan | Not |
| --- | --- | --- |
| Functional correctness | 7/10 | "Start Evaluation" → jury flow, "Admin" → admin panel. Temel routing çalışıyor. |
| UI quality | 6/10 | — |
| UX clarity | 6/10 | Juror kim olduğunu biliyor mu? İlk kez mi geliyor? Yardım metni ne kadar açıklayıcı? |
| Mobile usability | 7/10 | — |
| Performance | 9/10 | Minimal sayfa. |
| Accessibility | 6/10 | — |
| Code quality | 7/10 | — |
| Production readiness | 6/10 | — |

## 2. Juror Identity / Info Entry (InfoStep)

`src/jury/InfoStep.jsx`


| Kriter | Puan | Not |
| --- | --- | --- |
| Functional correctness | 8/10 | İki alan, validation, semester bilgisi gösterimi. |
| UI quality | 7/10 | Sade, odak doğru. Info strip semester bilgisini gösteriyor — iyi. |
| UX clarity | 6/10 | "Ad Soyad" ve "Kurum / Bölüm" açık. Ama ilk kez mi geldiği yoksa daha önce katılıp katılmadığı belli değil. "PIN oluşturacaksınız" veya "PIN'inizi gireceksiniz" bilgisi yok. |
| Mobile usability | 8/10 | İki input, büyük buton — mobil uyumlu. autoFocus ile klavye otomatik açılıyor. |
| Performance | 9/10 |
| Accessibility | 7/10 | Label + input ilişkisi var. role="alert" error için. |
| Code quality | 8/10 | Küçük, odaklı component. |
| Production readiness | 7/10 |

**What works well:**


- Info strip ile semester + grup sayısı gösterimi — juror ne kadarını değerlendireceğini biliyor.
- autoFocus iyi UX.

**Main weaknesses:**


- PIN akışı hakkında zero onboarding. Juror "başla" diyince PIN oluşturulacağını veya sorulacağını bilmiyor.
- Ad-soyad eşleştirme nasıl çalışıyor? Juror "Ahmet Yılmaz" yerine "ahmet yilmaz" yazarsa? Normalization açık değil.
- authError mesajı ne zaman gösteriliyor — kullanıcı için anlaşılır mı?

**Real user risks / edge cases:**


- İsim/kurum eşleşmesi: "A. Yılmaz" ile "Ahmet Yılmaz" farklı juror mu? Case normalization var ama accent normalization?
- Juror yanlışlıkla başkasının adını yazarsa ne olur? Sistem bunu nasıl yakalar?

**What should be improved first:**


- "İlk kez mi yoksa daha önce katıldınız mı?" branching sorusu veya açıklama.
- PIN akışı hakkında kısa bilgilendirme.

## 3. PIN Creation (PinRevealStep)

`src/jury/PinRevealStep.jsx`


| Kriter | Puan | Not |
| --- | --- | --- |
| Functional correctness | 7/10 | PIN gösterimi, kopyalama, clipboard fallback var. |
| UI quality | 7/10 | 4 büyük hane gösterimi iyi. |
| UX clarity | 4/10 | En kritik UX problemi burada. "Bunu kaydetmezsen bir daha göremezsin" mesajı ne kadar güçlü? Juror devam edip PIN'i kaybederse ne olur? Süreci iyi anlatmıyor. |
| Mobile usability | 7/10 | Copy buton mobilde çalışıyor. |
| Performance | 9/10 |
| Accessibility | 6/10 | PIN rakamları semantic olarak ne? <span> mi? Screen reader sırayla okur mu? |
| Code quality | 7/10 |
| Production readiness | 5/10 | PIN kayıp senaryosu production için risk. |

**What works well:**


- Clipboard API + execCommand fallback — robustness düşünülmüş.
- "Copied" feedback (1.5s) iyi.
- PIN'in tekrar kullanılabilirliğini açıklayan info mesajı var.

**Main weaknesses:**


- "One-time reveal" yüksek risk. Kullanıcı PIN'i kaydetmeden "Continue"'ya tıklarsa ve daha sonra PIN sorarsa ne olur? Admin PIN reset yapmak zorunda. Bu operasyonel yük.
- PIN kaydetmeden devam etmeyi engelleme mekanizması yok (checkbox "I've saved my PIN" gibi).
- Clipboard API sessizce başarısız olursa (bazı mobil tarayıcılarda) kullanıcı bunu anlayamaz.

**Real user risks / edge cases:**


- Android Chrome'da clipboard izni reddedilirse "Copied" feedback yine de gösteriyor mu?
- Juror "Continue" yerine sayfayı yanlışlıkla kapatırsa? Tekrar aynı PIN mi gösteriliyor yoksa yeni PIN mi üretiliyor?

**What should be improved first:**


- "PIN'i not ettim" checkbox'ı olmadan Continue'yu devre dışı bırak.
- Clipboard hatasını kullanıcıya göster.
- Juror tekrar aynı adımdan geçerse aynı PIN göster.

## 4. PIN Verification / Resume (PinStep)

`src/jury/PinStep.jsx`


| Kriter | Puan | Not |
| --- | --- | --- |
| Functional correctness | 8/10 | 4-box PIN girişi, rate limiting, lock state, hata kodları. |
| UI quality | 8/10 | 4 hane box tasarımı klasik ama işlevsel. Shake animasyonu güzel geri bildirim. |
| UX clarity | 7/10 | Error mesajları açık (kalan deneme sayısı). Lock süresi gösterimi iyi. |
| Mobile usability | 8/10 | inputMode="numeric", type="password", paste desteği. Sayısal klavye açıyor. |
| Performance | 9/10 |
| Accessibility | 7/10 | Bireysel PIN box'larına aria-label var mı? Şu an type="password" screen reader'a ne söylüyor? |
| Code quality | 8/10 | Paste, tab, arrow, backspace, enter handling — kapsamlı keyboard support. |
| Production readiness | 7/10 | Rate limiting var; ama 4 hane PIN zayıf. Güvenlik modeli "çoğu kullanıcı iyi niyetli" assumption'ına dayanıyor. |

**What works well:**


- Backspace → önceki kutuya odaklanma.
- Paste desteği (rakam çıkarma) — juror'ın not defterinden kopyala-yapıştırmasını kolaylaştırıyor.
- pinLockedUntil zamanı gösterimi.
- pinErrorCode ile farklı hata tipleri için farklı mesaj.

**Main weaknesses:**


- 4-digit PIN = 10,000 kombinasyon. Rate limiting critical. RPC düzeyinde sağlam mı?
- "3 attempts remaining" göstergesi — ya ilk hata mesajı 2 kaldığında mı gösteriliyor? Sayım kafası karıştırabilir.
- type="password" ile PIN maskeleniyor — ama PIN girişi için bu gerekli mi? Numeric PIN box görünür olabilir.

**Real user risks / edge cases:**


- pinLockedUntil server time'a göre mi hesaplanıyor? Client-server saat farkı sorunu var mı?
- Farklı cihazda PIN denemesi: lock state shared mı yoksa per-device mi?

## 5. Progress / Previous Evaluation Found (SheetsProgressDialog)

`src/jury/SheetsProgressDialog.jsx`


| Kriter | Puan | Not |
| --- | --- | --- |
| Functional correctness | 8/10 | Progress bar, expandable grup listesi, status badge, "Resume" vs "Start Fresh". |
| UI quality | 7/10 | Progress bar renk kodlaması anlamlı. Status badge'ler tutarlı. |
| UX clarity | 7/10 | "Start Fresh" tehlikeli bir aksiyon — onay dialog'u var mı? Confirmation olmadan tüm mevcut çalışma silinir. |
| Mobile usability | 7/10 | Modal overlay mobilde çalışır. Expandable rows tap-friendly mi? |
| Performance | 8/10 |
| Accessibility | 7/10 | aria-expanded/aria-controls var — doğru. |
| Code quality | 7/10 |
| Production readiness | 7/10 | "Start Fresh" confirmation eksikliği üretimde sorun çıkarır. |

**What works well:**


- Kısmi tamamlama durumunu (grup bazında) göstermek — juror nereden kaldığını biliyor.
- Status chip (completed, in_progress vb.) açık beklenti yönetiyor.
- Son güncelleme zamanı her grup için görünür.

**Main weaknesses:**


- "Start Fresh" confirmation yok. Juror yanlışlıkla tıklarsa 3 saatlik çalışma gidiyor. Bu production blocker'dır.
- "Start Fresh" aslında ne yapar? DB'den silme mi, sadece override mi? Fark önemli.

**Real user risks / edge cases:**


- Juror 40/45 grubu tamamlamışsa ve "Start Fresh" yaparsa ne olur? DB sıfırlanıyor mu?
- Ağ hatası sırasında progress yüklenemezse — kullanıcı ne görüyor? Boş dialog mı?

**What should be improved first:**


- "Start Fresh" öncesi "Tüm çalışmanız silinecek, emin misiniz?" confirmation.
- "Start Fresh" sonucunu DB düzeyinde açıkla (override mi, hard delete mi).

## 6. Evaluation Form (EvalStep)

`src/jury/EvalStep.jsx`


| Kriter | Puan | Not |
| --- | --- | --- |
| Functional correctness | 8/10 | Sticky header, grup navigasyonu, score input, autosave on blur, progress bar — kapsamlı. |
| UI quality | 7/10 | Save status indicator iyi. Progress gradient iyi. Header'ın 4 satırı yoğun ama bilgi-dolu. |
| UX clarity | 6/10 | Blur-based save: kullanıcı ne zaman kaydedildiğini her zaman anlamayabilir. Özellikle mobilde input blur davranışı tahmin edilemez. |
| Mobile usability | 7/10 | Header collapsing on scroll iyi düşünülmüş. Ama kriter input'larının yeterince büyük tap target'ı var mı? |
| Performance | 6/10 | Her group change'de writeGroup() çağrısı + state update + re-render. 45 grup × 4 kriter = çok state. PendingRef pattern doğru ama büyük state tree. |
| Accessibility | 5/10 | Kriter label'ları var ama aria-describedby ile rubric açıklamasına bağlanıyor mu? Score input range validation hataları nasıl iletiliyor? |
| Code quality | 5/10 | 250+ satır gösterildi, muhtemelen 400-500+ gerçek boyut. Çok büyük component. Group details, scoring form, rubric modal, header — hepsi tek dosyada. |
| Production readiness | 7/10 | Core flow çalışıyor. Ama büyük component bakım riskini artırıyor. |

**What works well:**


- pendingScoresRef pattern — async save her zaman güncel değeri okuyor, race condition yok.
- stateRef ile async callback'lerde stale closure sorunu çözülmüş — teknik olarak doğru karar.
- Save status indicator ("Saving...", "Saved", idle) — kullanıcıya anında feedback.
- Grup dropdown ile doğrudan atlama — 45 grupta sırayla gitmek zorunda değil.

**Main weaknesses:**


- EvalStep çok büyük — group details + header + scoring + rubric modal + navigation + comments tek component'ta. Test edilmesi, bakımı zor.
- Blur-based save problemi: Mobilde sayfa scroll edildiğinde klavye kapanırsa input blur olur mu? Eğer olursa istenmeyen kayıtlar tetiklenebilir; olmuyorsa kayıt tetiklenmez.
- Kısmi score (sadece 2/4 kriter dolu) kaydedilebiliyor — bu intentional mı? Partial submission risk.
- Lock state overlay'i — editLockActive olduğunda kullanıcı ne görüyor? Navigation beklentisi mi yoksa sert bir overlay mi?

**Real user risks / edge cases:**


- Juror 45 grubu değerlendirirken ağ kesintisi → autosave başarısız → Saved göstermiyor, error gösteriyor → juror panikliyor?
- Değer girip başka alana geçmeden navigasyon butonuna tıklanırsa — writeGroup() blur öncesi mi sonra mı?
- İki farklı cihazdan aynı anda aynı juror giriş yaparsa — race condition?

**What should be improved first:**


- EvalStep'i parçala: GroupHeader, ScoringForm, RubricModal, GroupNav ayrı component'lar.
- Save hataları için retry mekanizması + clear error state.
- "Tüm kriterleri doldurmadan devam" uyarısı (partial score riski).

## 7. Rubric Interaction

EvalStep içinde rubric expand/collapse modal.

| Kriter | Puan | Not |
| --- | --- | --- |
| Functional correctness | 7/10 | 4 bant (Excellent, Good, Developing, Insufficient) ile açıklama var. |
| UI quality | 6/10 | Modal olarak mı, inline collapse mı? Detaylar tam belli değil ama "expand button" var. |
| UX clarity | 7/10 | Bant sınırları (ör. Excellent: 27-30) görünür — juror karar verebiliyor. |
| Mobile usability | 6/10 | Modal mobilde full-screen mi? Yoksa küçük popup mu? |
| Performance | 9/10 | Statik veri — config.js'den. |
| Accessibility | 6/10 | Modal focus trap var mı? ESC kapanıyor mu? |
| Code quality | 7/10 | Config.js'den drive ediliyor — doğru yaklaşım. |
| Production readiness | 7/10 |

**Main weaknesses:**


- Rubric modal açıkken score'u değiştirebiliyor mu? Modal'dan direkt skor seçimi olmadığı sürece iki eleman arası context switch var.
- MÜDEK kodları rubric'te gösteriliyor mu? Admin analytics'te var ama juror bunu görmeli mi?

## 8. Group Navigation

EvalStep içinde ← Prev / Dropdown / Next →.

| Kriter | Puan | Not |
| --- | --- | --- |
| Functional correctness | 8/10 | Dropdown + ok tuşları + writeGroup on navigate. |
| UI quality | 7/10 | Completion status badge dropdown'da var — juror hangi grubu atladığını görebiliyor. |
| UX clarity | 8/10 | Sezgisel. |
| Mobile usability | 7/10 | Büyük nav butonları mobil dostu. |
| Performance | 8/10 | writeGroup async, nav anında. |
| Accessibility | 6/10 | Dropdown aria-haspopup="listbox" var. OK. |
| Code quality | 7/10 |
| Production readiness | 8/10 | Bu alan en olgun kısım. |

**Main weaknesses:**


- Son grupta "Next" → ne olur? Submit dialog mı açılıyor, devre dışı mı kalıyor?
- Juror aynı grubu tekrar açtığında önceki değerler doğru yükleniyor mu? (Evet, scores state'ten geliyor ama görsel feedback var mı?)

## 9. Submit Confirmation

| Kriter | Puan | Not |
| --- | --- | --- |
| Functional correctness | 7/10 | confirmingSubmit state ile dialog. |
| UI quality | 6/10 |
| UX clarity | 6/10 | Submit öncesi tüm grupların durumu özeti gösteriliyor mu? "5 grup boş bıraktınız" gibi uyarı var mı? |
| Mobile usability | 7/10 |
| Performance | 8/10 |
| Accessibility | 6/10 | role="dialog" + aria-modal var mı? |
| Code quality | 7/10 |
| Production readiness | 6/10 | Partial submission uyarısı olmadan submit ciddi veri kalitesi riski. |

**Main weaknesses:**


- Eksik gruplar için uyarı yok. Juror 40/45 grubu doldurup submit edebilir. Production'da anlamsız/eksik veri kabul ediliyor.
- Submit sonrası geri alınamıyor (edit mode admin tarafından açılmadan).

## 10. Success / Done Screen (DoneStep)

`src/jury/DoneStep.jsx`


| Kriter | Puan | Not |
| --- | --- | --- |
| Functional correctness | 8/10 | Submit özeti, edit mode check, confetti, butonlar. |
| UI quality | 8/10 | Confetti animasyonu tatmin edici. "Thank You, [Name]!" kişiselleştirilmiş. |
| UX clarity | 7/10 | Edit mode ile normal done farklı header — iyi ayrım. Tüm grupların özeti expandable. |
| Mobile usability | 7/10 | Confetti performansı mobilde nasıl? Canvas animation? |
| Performance | 6/10 | Confetti animasyonu — kütüphane ne? CSS mi, canvas mi? Düşük-end cihazda problem olabilir. |
| Accessibility | 5/10 | Confetti animasyonu prefers-reduced-motion medya sorgusunu respekt ediyor mu? |
| Code quality | 7/10 |
| Production readiness | 7/10 |

**What works well:**


- Edit mode için farklı başlık + "Edit My Scores" CTA — juror tekrar başlamasına gerek yok.
- Expandable grup özeti — juror ne gönderdiğini görebiliyor.

**Main weaknesses:**


- prefers-reduced-motion kontrolü kritik — bazı kullanıcılar animasyondan rahatsız olabilir veya vestibüler bozuklukları olabilir.
- Confetti sonra ne? Animasyon loop'ta mı duruyor mu?
- "Return Home" → session sıfırlanıyor mu? Sonraki kullanıcı aynı tarayıcıdan girerse önceki juror'ın verisini görür mü?

**What should be improved first:**


- prefers-reduced-motion kontrolü confetti için.
- "Return Home" → localStorage temizleme.

## 11. Locked / Read-Only States

| Kriter | Puan | Not |
| --- | --- | --- |
| Functional correctness | 6/10 | editLockActive state var. RPC rpc_get_juror_edit_state lock durumunu çekiyor. |
| UI quality | 5/10 | Lock overlay'in görsel kalitesi? |
| UX clarity | 4/10 | Juror lock state'e girdiğinde ne görüyor tam olarak? "Artık değiştiremezsiniz" mesajı yeterince açıklayıcı mı? "Admin ile iletişime geçin" gibi bir yönlendirme var mı? |
| Mobile usability | 6/10 |
| Performance | 8/10 |
| Accessibility | 5/10 | Read-only input'lar aria-readonly ile işaretleniyor mu? |
| Code quality | 6/10 |
| Production readiness | 5/10 | Lock UX'i yetersiz belgelenmiş — production'da juror panikleyebilir. |

**Main weaknesses:**


- Lock state'in juror tarafında görsel kalitesi ve mesaj netliği belirsiz.
- Semester lock ile juror edit lock arasındaki fark kullanıcıya gösterilmiyor olabilir.

# OVERALL SCORE TABLE

Admin Panel
| Bölüm | Func | UI | UX | Mobile | Perf | A11y | Code | Prod | Ort. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Settings | 7 | 6 | 5 | 4 | 7 | 5 | 5 | 6 | 5.6 |
| Scores / Rankings | 8 | 7 | 7 | 6 | 7 | 5 | 7 | 7 | 6.8 |
| Scores / Analytics | 7 | 6 | 5 | 3 | 4 | 2 | 3 | 5 | 4.4 |
| Scores / Grid | 8 | 7 | 7 | 6 | 7 | 4 | 7 | 7 | 6.6 |
| Scores / Details | 8 | 6 | 5 | 4 | 7 | 5 | 7 | 6 | 6.0 |
| Overview | 7 | 7 | 7 | 7 | 8 | 6 | 7 | 7 | 7.0 |
Jury Flow
| Bölüm | Func | UI | UX | Mobile | Perf | A11y | Code | Prod | Ort. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Landing / Entry | 7 | 6 | 6 | 7 | 9 | 6 | 7 | 6 | 6.8 |
| InfoStep | 8 | 7 | 6 | 8 | 9 | 7 | 8 | 7 | 7.5 |
| PinRevealStep | 7 | 7 | 4 | 7 | 9 | 6 | 7 | 5 | 6.5 |
| PinStep | 8 | 8 | 7 | 8 | 9 | 7 | 8 | 7 | 7.8 |
| SheetsProgressDialog | 8 | 7 | 7 | 7 | 8 | 7 | 7 | 7 | 7.3 |
| EvalStep | 8 | 7 | 6 | 7 | 6 | 5 | 5 | 7 | 6.4 |
| Rubric Interaction | 7 | 6 | 7 | 6 | 9 | 6 | 7 | 7 | 6.9 |
| Group Navigation | 8 | 7 | 8 | 7 | 8 | 6 | 7 | 8 | 7.4 |
| Submit Confirmation | 7 | 6 | 6 | 7 | 8 | 6 | 7 | 6 | 6.6 |
| DoneStep | 8 | 8 | 7 | 7 | 6 | 5 | 7 | 7 | 6.9 |
| Lock / Read-only | 6 | 5 | 4 | 6 | 8 | 5 | 6 | 5 | 5.6 |

# TOP 10 CRITICAL ISSUES (Release Blocker)

| # | Problem | Etkilenen Alan | Risk |
| --- | --- | --- | --- |
| 1 | "Start Fresh" confirmation yok — tek tıkla tüm jury çalışması kaybolabilir | SheetsProgressDialog | Veri kaybı |
| 2 | State-based routing — no URL history — tarayıcı geri tuşu bozuk, deep link yok | Tüm uygulama | UX / kullanılabilirlik |
| 3 | Charts.jsx 91KB monolith — lazy load yoksa ilk yükleme yavaş + bakım impossible | Analytics | Perf / maintainability |
| 4 | Analytics charts için accessibility yok — SVG/canvas chart'lar screen reader için anlamsız | Analytics | A11y / yasal risk |
| 5 | Settings'te unsaved change guard yok — form doldurup navigasyon = sessiz veri kaybı | Settings | Veri kaybı |
| 6 | PinRevealStep: "I saved my PIN" confirmation yok — PIN kaybı = her seferinde admin PIN reset operasyonu | PinRevealStep | Operasyonel yük |
| 7 | Submit öncesi tamamlanmamış grup uyarısı yok — partial/empty submission ile sistem kirletilir | Submit Confirmation | Veri kalitesi |
| 8 | Lock state UX belirsiz — juror lock'a girdiğinde yeterli açıklama görmüyor olabilir | Lock/ReadOnly | Kullanıcı paniği |
| 9 | DoneStep confetti prefers-reduced-motion kontrolsüz — vestibüler bozukluğu olan kullanıcılar için sorun | DoneStep | A11y / erişilebilirlik |
| 10 | Silme işlemlerinde cascade etkisi kullanıcıya gösterilmiyor — juror / group / semester silerken ne kaybolacağı belirsiz | Settings | Veri kaybı |

# TOP 10 MEDIUM-PRIORITY IMPROVEMENTS

| # | İyileştirme | Etkilenen Alan |
| --- | --- | --- |
| 1 | CSV import preview + satır bazlı validation özeti | Settings Import |
| 2 | Details'ta aktif filtre badge sayısı + "Tüm filtreleri temizle" | Scores Details |
| 3 | Analytics mobile fallback: chart yerine data table | Analytics |
| 4 | Overview'da son veri güncelleme zamanı + manual refresh butonu | Overview |
| 5 | Score grid'de tooltip'e touch-tap desteği | Scores Grid |
| 6 | "Return Home" akışında localStorage session temizleme | DoneStep |
| 7 | EvalStep parçalama: GroupHeader, ScoringForm, RubricModal ayrı component | EvalStep |
| 8 | Admin tab URL state — sub-tab'ların URL'de görünmesi (React Router) | Admin Nav |
| 9 | Semester switch'te Details filter state'i reset et | Scores Details |
| 10 | InfoStep'te PIN akışı hakkında küçük onboarding mesajı | InfoStep |

# BEST PARTS OF THE PRODUCT

PinStep keyboard handling — paste, backspace, arrow, tab, enter — en kapsamlı ve doğru implement edilmiş küçük component.

pendingScoresRef + stateRef pattern — async autosave'de stale closure ve race condition'ı önlemek için gerçek mühendislik kararları. Birçok senior developer bunu yanlış yapar.

Group navigation dropdown'da completion status — juror'ın hangi grubu atladığını anında görmesi. Ürün düşüncesi.

ScoreGrid hook ayrışımı — useGridSort, useScrollSync, useScoreGridData, useGridExport — sorumluluk ayrımı doğru.

config.js SINGLE SOURCE OF TRUTH — kriter isimleri, max değerler, rubric açıklamaları, MÜDEK kodları tek yerden. Değişiklik yapmak kolay.

MÜDEK outcome mapping + threshold line — akademik kontekste domain bilgisi ürüne gömülmüş. Generic analytics değil.

Admin password useRef — şifreyi state tree'den dışarıda tutmak gerçek güvenlik bilinci.

JurorActivity component — Overview'da per-juror zaman damgalı aktivite — admin'in hangi juror'ın geciktiğini anlık görmesi.


# FINAL VERDICT

Genel Puan: 6.4 / 10
Domain özgü bir değerlendirme sistemi için iyi çalışan bir proof-of-concept ile production-ready arasında bir yerdeyiz. Feature density yüksek, temel akışlar çalışıyor. Ama birkaç ciddi kör nokta var.


### En Güçlü Sayfa:

PinStep (7.8) ve SheetsProgressDialog (7.3)

Küçük, odaklı, iyi test edilebilir, edge case'leri düşünülmüş.


### En Zayıf Sayfa:

Analytics Tab (4.4)

91KB monolith + charts accessibility yok + mobile kullanılmaz. Bu kombinasyon ciddi bir yeniden yazım gerektiriyor.


### Production-Ready Alanlar:

PinStep — rate limiting, hata mesajları, keyboard support tümü hazır.
Group Navigation — en olgun flow.
Overview — basit, çalışan, anlamlı.
Rankings — çalışıyor, export var, virtualization var.

### Hâlâ Riskli Alanlar:

Analytics — accessibility + performance + maintainability üçlüsü.
Settings — unsaved change guard yok, cascade delete bilgisi yok, CSV import error UX zayıf.
Lock/Unlock UX — juror lock state'de ne göreceği belirsiz.
PinRevealStep — PIN kayıp senaryosu operasyonel yük yaratır.
Routing mimarisi — state-based routing tüm ürünün deep link, bookmark, geri tuşu özelliklerini engeller.

### Bir Paragrafta Özet:

Proje akademik bir bağlamda iyi düşünülmüş bir domain modeline ve bazı gerçek mühendislik kararlarına sahip. Temel jury akışı büyük ölçüde çalışıyor. Ama production'a hazır olmayan birkaç kritik boşluk var: state-based routing tüm navigasyon geçmişini kırıyor, Analytics tab'ı accessibility açısından fail ediyor ve 91KB monolith olarak bakımı imkânsız, Settings'te unsaved change guard yokken veri kaybı an meselesi, ve "Start Fresh" confirmation eksikliği gerçek bir kullanıcı felaketi potansiyeli taşıyor. Bu beş şey düzeltilirse skor 7.5'e çıkabilir.