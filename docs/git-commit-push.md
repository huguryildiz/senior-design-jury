# Git: Commit & Push Nasıl Yapılır

## 1. Değişiklikleri Kontrol Et

```bash
git status
```

Hangi dosyaların değiştiğini gösterir.

```bash
git diff
```

Değişikliklerin içeriğini gösterir.

---

## 2. Dosyaları Stage'e Al

Belirli dosyalar:

```bash
git add src/AdminPanel.jsx src/App.jsx
```

Tüm değişiklikler (dikkatli kullan):

```bash
git add .
```

---

## 3. Commit Oluştur

```bash
git commit -m "fix: settings tab demo modda görünür hale getirildi"
```

### Commit Mesajı Formatı

Bu projede [Conventional Commits](https://www.conventionalcommits.org/) formatı kullanılır:

| Prefix | Ne zaman |
|--------|----------|
| `feat:` | Yeni özellik |
| `fix:` | Hata düzeltme |
| `chore:` | Build, config, bağımlılık güncellemeleri |
| `refactor:` | Davranış değişmeden kod yeniden düzenleme |
| `test:` | Test ekleme / güncelleme |
| `docs:` | Sadece dokümantasyon |

Çok satırlı mesaj için HEREDOC kullan:

```bash
git commit -m "$(cat <<'EOF'
fix: settings tab demo modda görünür hale getirildi

- isDemoMode koşulu kaldırıldı
- SettingsPage render koşulu güncellendi

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## 4. Remote'a Push Et

```bash
git push origin main
```

İlk kez push ediyorsan (upstream ayarla):

```bash
git push -u origin main
```

---

## 5. Durumu Doğrula

```bash
git log --oneline -5
```

Son 5 commit'i listeler. En üstteki commit'in remote'a gittiğini GitHub'dan da doğrulayabilirsin.

---

## Sık Kullanılan Kısayollar

```bash
# Stage + commit tek adımda (sadece takip edilen dosyalar)
git commit -am "fix: küçük düzeltme"

# Son commit'i henüz push etmediysen geri al
git reset --soft HEAD~1

# Hangi commit'ler push edilmedi?
git log origin/main..HEAD --oneline
```
