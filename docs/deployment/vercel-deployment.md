# Vercel Deployment — VERA

VERA's frontend is deployed as a static site via Vercel. The Supabase backend (database, Edge Functions) is deployed separately — see [supabase-setup.md](supabase-setup.md).

---

## 1. Connect the Repository

1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New → Project**.
3. Import the `VERA` GitHub repository.
4. Vercel auto-detects Vite. Accept the default framework preset.

---

## 2. Configure Build Settings

Vercel should detect these automatically from the project. Verify:

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm install` |

No `vercel.json` file is needed. Vite's `base: "/"` setting in `vite.config.js` ensures assets resolve correctly at the domain root.

---

## 3. Set Environment Variables

In **Project Settings → Environment Variables**, add the following. Apply to the **Production** environment (and Preview/Development if needed).

| Variable | Value | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` | From Supabase Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Anon/public key from Supabase |
| `VITE_DEMO_MODE` | `true` or `false` | Optional. Set `true` for a public demo deployment. |
| `VITE_DEMO_ADMIN_PASSWORD` | `<password>` | Optional. Only if `VITE_DEMO_MODE=true`. |

**Do NOT add `VITE_RPC_SECRET` to Vercel.** In production, the RPC secret lives in Supabase Vault and is injected by the `rpc-proxy` Edge Function — it never needs to be in the browser environment.

---

## 4. Deploy

After configuring environment variables, trigger a deploy:

- **Automatic:** Push to the `main` branch — Vercel deploys automatically.
- **Manual:** Go to the Vercel dashboard → project → **Deployments** → **Redeploy**.

---

## 5. Verify the Deployment

1. Open the production URL (e.g. `https://vera.vercel.app` or your custom domain).
2. The home page should load.
3. Click **Admin Panel** → enter the admin password → the dashboard should load with data from Supabase.
4. Click **Jury Evaluation** → you should land on the `jury_gate` screen. Follow a valid entry-token link (QR or `?t=<token>`) to reach the evaluation flow.

If admin RPCs fail (403/401), verify the `rpc-proxy` Edge Function is deployed and the `RPC_SECRET` Vault secret is set correctly. See [supabase-setup.md](supabase-setup.md).

If the browser shows a CORS error for `rpc-proxy`, also verify Supabase Edge Function secrets:

- `ALLOWED_ORIGINS` includes your active Vercel URL (for example `https://vera-demo.vercel.app`)
- `ALLOW_WILDCARD_ORIGIN=false` in production

---

## Custom Domain (optional)

In Vercel: **Project Settings → Domains** → add your domain and follow the DNS instructions.

---

## Preview Deployments

Vercel creates a preview URL for every pull request. These share the production Supabase project by default (because environment variables are set at the project level). If you need isolated data for preview environments, create a separate Supabase project and set different env vars for the Preview environment tier in Vercel.
