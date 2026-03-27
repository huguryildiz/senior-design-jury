# SQL Migrations Tutorial: Admin Application Email Notifications

This guide explains the exact setup we implemented for tenant admin application emails in TEDU VERA.

## What This Setup Does

- When a new admin application is submitted, email notifications are sent.
- Notifications are dispatched from Postgres via `pg_net` to the `notify-application` Edge Function.
- Recipient list is all global super admins (`tenant_admin_memberships.role = 'super_admin'` and `tenant_id IS NULL`).
- Email sending is done by Resend.
- HTML template is used, with optional logo and CTA URLs from secrets.

---

## 1. Apply SQL Changes

Apply the updated functions in:

- `sql/migrations/006_admin_tenant_rpcs.sql`

Important functions in this file:

- `public._dispatch_application_notification(...)`
- `public.rpc_admin_application_submit(...)` (6-arg overload)
- `public.rpc_admin_application_submit(...)` (4-arg overload)

Behavior:

- Both submit overloads now notify **all** global super admin emails.
- `_dispatch_application_notification` calls:
  - `POST /functions/v1/notify-application`

---

## 2. Deploy Edge Function

From project root:

```bash
supabase link --project-ref kmprsxrofnemmsryjhfj
supabase functions deploy notify-application --no-verify-jwt
```

Why `--no-verify-jwt`:

- DB-triggered `pg_net` calls do not send user JWT by default.

---

## 3. Set Required Secrets

```bash
supabase secrets set RESEND_API_KEY="YOUR_RESEND_KEY"
supabase secrets set NOTIFICATION_FROM="VERA <vera@huguryildiz.com>"
supabase secrets set NOTIFICATION_LOGO_URL="https://kmprsxrofnemmsryjhfj.supabase.co/storage/v1/object/public/vera_logo/vera_logo_white.png"
```

Optional CTA links used by the HTML template:

```bash
supabase secrets set NOTIFICATION_REVIEW_URL="https://vera-demo.vercel.app/admin"
supabase secrets set NOTIFICATION_APP_URL="https://vera-demo.vercel.app"
```

---

## 4. CORS Setup for `rpc-proxy`

If you use multiple origins (Vercel + localhost + LAN), set:

```bash
supabase secrets set ALLOWED_ORIGINS="http://192.168.68.105:5173,https://vera-demo.vercel.app,http://localhost:5173" ALLOW_WILDCARD_ORIGIN="false"
```

Notes:

- Use exact origins.
- Do not add trailing slash.

---

## 5. Verify Super Admin Recipients

Run in SQL Editor:

```sql
select u.email, tam.created_at
from public.tenant_admin_memberships tam
join auth.users u on u.id = tam.user_id
where tam.role = 'super_admin'
  and tam.tenant_id is null
order by tam.created_at asc;
```

Expected:

- One row per recipient.
- New submission sends one email per row.

---

## 6. Test End-to-End

1. Submit a new tenant admin application from UI.
2. Check inbox of global super admins.
3. Check function logs in Supabase Dashboard:
   - Edge Functions -> `notify-application` -> Logs

Expected log fields:

- `type: application_submitted`
- `sent: true` (or `false` with error details)

---

## 7. Troubleshooting

If no mail arrives:

1. Confirm latest SQL is applied (both `rpc_admin_application_submit` overloads).
2. Confirm function is redeployed after template/code changes.
3. Confirm `RESEND_API_KEY` is valid.
4. Confirm `NOTIFICATION_FROM` domain is authorized in Resend.
5. Confirm super admin rows exist in `tenant_admin_memberships`.
6. Check `notify-application` logs for `error`.

If logo does not appear:

1. Use a public, direct image URL.
2. Verify `NOTIFICATION_LOGO_URL` secret is set correctly.
3. Send a new email after updating the secret.

---

## 8. Current Design Decision

Current recipient strategy:

- Notify all global super admins from DB.
- No tenant-specific `settings.notification_email` dependency.

If needed later, this can be switched back to tenant-specific routing.

