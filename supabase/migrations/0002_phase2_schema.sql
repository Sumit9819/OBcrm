-- ==============================================================================
-- Migration 0001: Phase 2 Enhancements (Accounting, Documents, Partners)
-- ==============================================================================

-- 1. Modify Enums for Phase 2 Roles and Entities

CREATE TYPE invoice_type AS ENUM ('student_tuition', 'student_visa', 'student_service', 'university_commission');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE document_type AS ENUM ('passport', 'visa', 'transcript', 'offer_letter', 'other');

-- ==========================================
-- 2. University Partner Database
-- ==========================================
CREATE TABLE public.universities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    website TEXT,
    base_commission_rate DECIMAL(5,2), -- e.g., 15.00 for 15%
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS: Agencies can view and manage their partnered universities
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agencies manage own universities" ON public.universities
    FOR ALL USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

CREATE TABLE public.courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE, -- Denormalized for simpler RLS
    name TEXT NOT NULL,
    level TEXT NOT NULL, -- e.g., Bachelors, Masters
    intake_season TEXT NOT NULL, -- e.g., Fall 2027, Spring 2028
    tuition_fee DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agencies manage own courses" ON public.courses
    FOR ALL USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

-- ==========================================
-- 3. Document Management & Expiry Tracking
-- ==========================================
CREATE TABLE public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.users(id),
    name TEXT NOT NULL,
    doc_type document_type NOT NULL,
    file_url TEXT NOT NULL, -- Path to Supabase Storage bucket
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS: Agents can see documents for leads they have access to
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents view/manage documents for accessible leads" ON public.documents
    FOR ALL USING (
        agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid())
        AND (
            lead_id IN (
                SELECT id FROM public.leads 
                WHERE owner_id = auth.uid() OR is_shared_with_company = true
            )
            OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'agency_admin')
            OR auth.uid() = uploaded_by -- Student viewing their own docs
        )
    );

-- ==========================================
-- 4. Accounting & Invoicing
-- ==========================================
CREATE TABLE public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.users(id),
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL, -- Nullable if commission invoice directly to uni
    university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL, -- Used for commission invoices
    type invoice_type NOT NULL,
    status invoice_status NOT NULL DEFAULT 'draft',
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    due_date DATE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    pdf_url TEXT, -- Path to stored generated PDF
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS: Accountants and Admins see all agency invoices. Students see their own.
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accountants/Admins manage all agency invoices" ON public.invoices
    FOR ALL USING (
        agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid())
        AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'agency_admin', 'accountant')
    );

CREATE POLICY "Students view own invoices" ON public.invoices
    FOR SELECT USING (
        lead_id IN (SELECT id FROM public.leads WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
        AND type IN ('student_tuition', 'student_visa', 'student_service')
    );

CREATE POLICY "Agents view invoices for their leads" ON public.invoices
    FOR SELECT USING (
        agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid())
        AND lead_id IN (SELECT id FROM public.leads WHERE owner_id = auth.uid() OR is_shared_with_company = true)
    );
