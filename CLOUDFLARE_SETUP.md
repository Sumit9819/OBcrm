# Cloudflare Multi-Tenant Setup Guide

This guide explains how to configure Cloudflare so each company gets their own workspace URL.

---

## Option A — Your Subdomain (Recommended to start)

Each client gets `clientname.yourdomain.com`. You control the DNS.

### Step 1: Add Wildcard DNS in Cloudflare

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain (e.g. `growthcrm.app`)
3. Go to **DNS** → **Add record**
4. Add this record:

| Type  | Name | Content                  | Proxy |
|-------|------|--------------------------|-------|
| CNAME | `*`  | `your-app.pages.dev`     | ✅ On |

> Replace `your-app.pages.dev` with your Cloudflare Pages deployment URL.

This makes `ANY subdomain.yourdomain.com` route to your app.

### Step 2: Create Agency in Admin Panel

1. Go to `admin.yourdomain.com/admin`
2. Click **New Agency**
3. Fill in:
   - Company Name → e.g. `Acme Education`
   - Subdomain → e.g. `acme` (becomes `acme.yourdomain.com`)
   - Plan, users, timezone

### Step 3: Done! ✅

Visit `acme.yourdomain.com` — the middleware resolves to `Acme Education`'s workspace.

---

## Option B — Client's Own Domain

The client wants `crm.theircompany.com` instead of `acme.yourdomain.com`.

### Step 1: Client Adds a CNAME in Their DNS

The client goes into **their** DNS provider (could also be Cloudflare) and adds:

| Type  | Name  | Content                           | Proxy |
|-------|-------|-----------------------------------|-------|
| CNAME | `crm` | `your-app.pages.dev`              | ❌ Off |

> The proxy must be OFF on the client's side to avoid certificate conflicts.

### Step 2: Add Custom Domain in Cloudflare Pages

1. Go to Cloudflare Dashboard → Pages → Your app
2. **Custom Domains** → Add `crm.theircompany.com`
3. Cloudflare automatically provisions a TLS certificate ✅

### Step 3: Register in Admin Panel

1. Go to `admin.yourdomain.com/admin` → Create or Edit Agency
2. Set **Custom Domain** to `crm.theircompany.com`
3. The middleware will now resolve `crm.theircompany.com` to that agency

---

## Environment Variables (Production)

Update these in your Cloudflare Pages settings:

```
NEXT_PUBLIC_ROOT_DOMAIN=growthcrm.app
NEXT_PUBLIC_ADMIN_DOMAIN=admin.growthcrm.app
```

And add `admin.growthcrm.app` as a custom domain in Cloudflare Pages too.

---

## Local Development Testing

To test multi-tenancy locally, edit your Windows hosts file:

**Path:** `C:\Windows\System32\drivers\etc\hosts`

```
127.0.0.1  acme.localhost
127.0.0.1  demo.localhost
127.0.0.1  admin.localhost
```

Then access:
- `http://acme.localhost:3000` → Acme's workspace
- `http://demo.localhost:3000` → Demo's workspace
- `http://admin.localhost:3000/admin` → Super-admin panel

> **Note:** You must run the app on port 3000 (`npm run dev`).

---

## How Tenant Resolution Works

```
Request to acme.yourdomain.com
        │
        ▼
Cloudflare CNAME * → your-app.pages.dev
        │
        ▼
Next.js Middleware reads hostname "acme.yourdomain.com"
        │
        ▼
Calls resolve_agency_by_host("acme.yourdomain.com") in Supabase
        │
  ┌─────┴───────┐
  │ Found?       │
  │             │
  ▼             ▼
Set agency     Redirect to
cookie +     /invalid-workspace
forward        (error page)
request
        │
        ▼
All DB queries automatically
scoped to agency_id via RLS
```

---

## Database Isolation Guarantee

Three layers prevent data leaks between tenants:

| Layer | Mechanism |
|-------|-----------|
| **Middleware** | Resolves `agency_id` from hostname, stores in cookie |
| **App code** | All queries filter by `agency_id` from the cookie |
| **Supabase RLS** | Database rejects any query not matching the user's `agency_id` |

Even if the app has a bug, RLS at the DB level means **it's impossible for one agency to see another's data**.
