-- ================================================================
-- Migration 0017: Multi-Tenancy Support
-- Adds slug, subdomain, is_active to agencies.
-- These three fields let the middleware resolve which tenant
-- owns an incoming request based solely on the hostname.
-- ================================================================

-- ── 1. Enhance agencies table ────────────────────────────────────

ALTER TABLE public.agencies
    ADD COLUMN IF NOT EXISTS slug         text UNIQUE,          -- URL-safe ID: "acme-corp"
    ADD COLUMN IF NOT EXISTS subdomain    text UNIQUE,          -- "acme" in acme.yourdomain.com
    ADD COLUMN IF NOT EXISTS is_active    boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS plan         text NOT NULL DEFAULT 'starter'
                                              CHECK (plan IN ('starter','professional','enterprise')),
    ADD COLUMN IF NOT EXISTS max_users    integer NOT NULL DEFAULT 10,
    ADD COLUMN IF NOT EXISTS timezone     text NOT NULL DEFAULT 'UTC',
    ADD COLUMN IF NOT EXISTS updated_at   timestamptz DEFAULT now();

-- Rename existing custom_domain column (already existed in 0000) — it stays as-is
-- custom_domain = the client's own domain like "crm.clientcompany.com"

-- ── 2. Performance indexes ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_agencies_slug        ON public.agencies(slug);
CREATE INDEX IF NOT EXISTS idx_agencies_subdomain   ON public.agencies(subdomain);
CREATE INDEX IF NOT EXISTS idx_agencies_custom_domain ON public.agencies(custom_domain);
CREATE INDEX IF NOT EXISTS idx_agencies_is_active   ON public.agencies(is_active);

-- ── 3. RLS: only active agencies expose data ────────────────────
-- Add is_active guard to the existing "Users can view their agency" policy
DROP POLICY IF EXISTS "Users can view their agency" ON public.agencies;
CREATE POLICY "Users can view their agency" ON public.agencies
    FOR SELECT USING (
        id = (SELECT agency_id FROM public.users WHERE id = auth.uid())
        AND is_active = true
    );

-- Super admins (no agency_id) can see all agencies
CREATE POLICY "Super admins view all agencies" ON public.agencies
    FOR ALL USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    );

-- ── 4. Seed default slug/subdomain for any existing agencies ────
-- Fill slug = subdomain = id::text for any pre-existing agencies that lack one
UPDATE public.agencies
SET
    slug      = COALESCE(slug,      lower(regexp_replace(company_name, '[^a-zA-Z0-9]+', '-', 'g'))),
    subdomain = COALESCE(subdomain, lower(regexp_replace(company_name, '[^a-zA-Z0-9]+', '-', 'g')))
WHERE slug IS NULL OR subdomain IS NULL;

-- ── 5. Helper function: resolve agency from hostname ────────────
-- Called by the middleware via an RPC to avoid multiple round-trips.
-- Returns the agency row that owns a given hostname.
CREATE OR REPLACE FUNCTION public.resolve_agency_by_host(p_host text)
RETURNS TABLE (
    id              uuid,
    company_name    text,
    slug            text,
    subdomain       text,
    custom_domain   text,
    logo_url        text,
    branding_primary_color text,
    is_active       boolean,
    plan            text,
    max_users       integer,
    timezone        text
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
    SELECT
        id, company_name, slug, subdomain, custom_domain,
        logo_url, branding_primary_color, is_active, plan, max_users, timezone
    FROM public.agencies
    WHERE
        is_active = true
        AND (
            custom_domain = p_host          -- exact custom domain match
            OR subdomain  = split_part(p_host, '.', 1)  -- subdomain prefix match
        )
    LIMIT 1;
$$;

-- ── 6. Agency Invitations table ─────────────────────────────────
-- Allows super-admin to invite the first agency_admin for a new tenant
CREATE TABLE IF NOT EXISTS public.agency_invitations (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id   uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    invited_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
    email       text NOT NULL,
    role        text NOT NULL DEFAULT 'agency_admin'
                    CHECK (role IN ('agency_admin','staff','agent','accountant')),
    token       text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    accepted_at timestamptz,
    expires_at  timestamptz NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.agency_invitations ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all invitations
CREATE POLICY "Super admins manage invitations" ON public.agency_invitations
    FOR ALL USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    );

-- Agency admins can manage their own agency's invitations
CREATE POLICY "Agency admins manage own invitations" ON public.agency_invitations
    FOR ALL USING (
        agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid())
        AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'agency_admin'
    );

-- ── 7. Updated_at trigger for agencies ──────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agencies_updated_at ON public.agencies;
CREATE TRIGGER trg_agencies_updated_at
    BEFORE UPDATE ON public.agencies
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
