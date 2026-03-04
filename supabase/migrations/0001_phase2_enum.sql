-- ==============================================================================
-- Migration 0001: Phase 2 Enum Enhancements
-- ==============================================================================

-- 1. Modify Enums for Phase 2 Roles 
-- NOTE: Postgres requires this to be in its own transaction block before use
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'accountant';
