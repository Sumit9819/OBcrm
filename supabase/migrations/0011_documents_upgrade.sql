-- Migration: Add file_size and mime_type to documents table
-- Run this in the Supabase SQL Editor.
-- These columns are used by the upgraded Documents page to display file size and enable preview/download.

ALTER TABLE public.documents
    ADD COLUMN IF NOT EXISTS file_size BIGINT,          -- file size in bytes
    ADD COLUMN IF NOT EXISTS mime_type TEXT;            -- e.g. 'application/pdf', 'image/jpeg'

-- Also ensure the storage bucket allows delete operations by authenticated users
-- (SELECT/INSERT policies were already added in 0000_schema.sql)
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'documents'
        AND auth.uid() IS NOT NULL
    );

-- Also extend the document_type enum to include new types we added to the UI
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'ielts';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'bank_statement';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'photo';
