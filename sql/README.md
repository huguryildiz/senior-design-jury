# SQL Migration Files

Bu klasör, Supabase veritabanı şemasını ve güvenlik yamalarını içerir.

## Dosyalar ve Uygulama Sırası

```
000_bootstrap.sql       ← Önce uygula (schema, tables, RPCs, RLS)
001_security_fixes.sql  ← Sonra uygula (güvenlik yamaları)
001_dummy_seed.sql      ← Opsiyonel: sadece test/staging ortamında
```

### `000_bootstrap.sql`
Boş bir Supabase projesini sıfırdan kurar. Şunları içerir:
- Extensions (`pgcrypto`)
- Tables: `semesters`, `projects`, `jurors`, `scores`, `audit_log`
- Triggers, views
- Public RPCs (jüri akışı için)
- Admin RPCs (yönetim paneli için)
- Grants ve RLS (Row Level Security) kuralları

**Idempotent:** `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION` — tekrar çalıştırılabilir.

### `001_security_fixes.sql`
`2026-03-14` tarihinde uygulanan güvenlik yamaları:
- CSPRNG tabanlı PIN üretimi (`gen_random_bytes` ile, `random()` yerine)
- Her başarısız PIN denemesinde audit log kaydı
- `rpc_admin_full_export`'ta `pin_hash` / `pin_plain_once` alanları gizlendi
- `rpc_admin_full_export` için eksik GRANT eklendi

**Idempotent:** Tüm fonksiyonlar `CREATE OR REPLACE` — tekrar çalıştırılabilir.

### `001_dummy_seed.sql`
Test verisi: örnek semester, projeler, jürörler.

> **Production'a uygulanmaz.** Sadece staging veya local test ortamı için.

---

## Nasıl Uygulanır

### Supabase Dashboard (önerilen)

1. [Supabase Dashboard](https://supabase.com/dashboard) → projeyi seç
2. **SQL Editor** → **New query**
3. `000_bootstrap.sql` içeriğini yapıştır → **Run**
4. `001_security_fixes.sql` içeriğini yapıştır → **Run**
5. (Opsiyonel) `001_dummy_seed.sql` → sadece staging'de

### psql ile

```bash
psql "$DATABASE_URL" -f sql/000_bootstrap.sql
psql "$DATABASE_URL" -f sql/001_security_fixes.sql
```

`DATABASE_URL`: Supabase Dashboard → Settings → Database → Connection string (URI).

---

## Yeni Değişiklik Eklerken

`002_<açıklama>.sql` formatında yeni dosya aç:

```
sql/002_add_group_feedback_column.sql
```

Dosya başına şu header'ı ekle:

```sql
-- sql/002_add_group_feedback_column.sql
-- Applied: YYYY-MM-DD
-- Purpose: ...
-- Safe to re-run: yes/no
```

Ardından bu README'ye yeni dosyayı ekle.
