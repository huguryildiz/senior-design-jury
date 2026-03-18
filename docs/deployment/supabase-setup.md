# Supabase Setup — VERA

How to set up a Supabase project for VERA (new installation or new environment).

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Choose an organization, name the project (e.g. `vera-production` or `vera-dev`), set a database password, and select a region.
4. Wait for the project to finish provisioning (~2 minutes).

---

## 2. Apply the Database Schema

The full schema (tables, RLS policies, RPC functions, triggers, grants) lives in `sql/000_bootstrap.sql`.

### Option A — Supabase Studio SQL Editor (recommended for first setup)

1. In your Supabase project, go to **SQL Editor**.
2. Open `sql/000_bootstrap.sql` from this repository.
3. Paste the entire contents into the editor and click **Run**.
4. Verify no errors. All tables, functions, and grants should be created.

### Option B — Supabase CLI

```bash
supabase db push --db-url "postgresql://postgres:<password>@<host>:5432/postgres"
```

> Note: `sql/000_bootstrap.sql` is the authoritative schema, not the `supabase/migrations/` folder. Apply it directly.

---

## 3. Load Seed Data (dev/staging only)

For development or demo environments, apply the dummy seed data:

1. In the SQL Editor, paste and run `sql/001_dummy_seed.sql`.
2. This creates a test semester, sample projects, and test jurors.

> Do not apply seed data to a production database.

---

## 4. Set the Admin Password

The admin password is stored as a bcrypt hash in the `settings` table. Use the
bootstrap RPC functions in the SQL Editor:

```sql
-- Set the initial admin password (only works when no password is set yet)
SELECT rpc_admin_bootstrap_password('your-chosen-admin-password');

-- Set the delete password (required for destructive operations)
SELECT rpc_admin_bootstrap_delete_password('your-delete-password', 'your-chosen-admin-password');

-- Set the backup/export password
SELECT rpc_admin_bootstrap_backup_password('your-backup-password', 'your-chosen-admin-password');
```

All three passwords can also be changed later from the admin panel → Security tab.

---

## 5. Deploy the Edge Function

The `rpc-proxy` Edge Function proxies admin RPC calls in production so that `RPC_SECRET` never reaches the browser.

**Install Supabase CLI** (if not already installed):

```bash
npm install -g supabase
```

### Link your project

```bash
supabase link --project-ref <your-project-ref>
```

The project ref is the string in your Supabase project URL: `https://supabase.com/dashboard/project/<project-ref>`.

### Deploy the function

```bash
supabase functions deploy rpc-proxy
```

---

## 6. Set the Vault Secret

The Edge Function reads `RPC_SECRET` from Supabase Vault at runtime. Set it in the Supabase dashboard:

1. Go to **Project Settings → Vault**.
2. Create a new secret named `RPC_SECRET`.
3. Set the value to a random string (e.g. output of `openssl rand -hex 32`).
4. Save.

This same value is used in `.env.local` as `VITE_RPC_SECRET` for local development (where the Edge Function is not involved).

---

## 7. Configure `.env.local`

Copy your project credentials to `.env.local`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key-from-project-settings>
VITE_RPC_SECRET=<same-value-you-set-in-vault>
```

Find the URL and anon key in **Project Settings → API**.

---

## 8. Verify

Start the dev server and test the connection:

```bash
npm run dev
```

1. Open `http://localhost:5173`.
2. Click **Admin Panel** — enter the password you set in step 4. The Overview tab should load (empty data is fine for a fresh setup).
3. In the admin panel → Settings → Permissions, generate an entry token for the active semester.
4. Click **Jury Evaluation** — you should be redirected to the `jury_gate` screen. Enter the entry token (or follow the QR link) to proceed to the evaluation flow.

---

## RLS Note

RLS (Row Level Security) is enabled by the bootstrap SQL with a default-deny policy. All table access goes through `SECURITY DEFINER` RPC functions. Never disable RLS on production tables.
