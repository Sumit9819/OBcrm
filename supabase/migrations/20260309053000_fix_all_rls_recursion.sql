-- ================================================================
-- Fix RLS Infinite Recursion Issues
-- ================================================================

DO $$ BEGIN
    -- tasks
    DROP POLICY IF EXISTS "Create tasks" ON tasks;
    CREATE POLICY "Create tasks" ON tasks FOR INSERT WITH CHECK (agency_id = get_my_agency_id());

    -- batch_enrollments
    DROP POLICY IF EXISTS "Manage batch enrollments" ON batch_enrollments;
    CREATE POLICY "Manage batch enrollments" ON batch_enrollments FOR INSERT WITH CHECK (
        batch_id IN (SELECT id FROM batches WHERE agency_id = get_my_agency_id())
    );

    -- chat_messages
    DROP POLICY IF EXISTS "Channel members send messages" ON chat_messages;
    CREATE POLICY "Channel members send messages" ON chat_messages FOR INSERT WITH CHECK (agency_id = get_my_agency_id());

    -- leads
    DROP POLICY IF EXISTS "Members insert leads" ON leads;
    CREATE POLICY "Members insert leads" ON leads FOR INSERT WITH CHECK (agency_id = get_my_agency_id());
    
    DROP POLICY IF EXISTS "Agents update leads" ON leads;
    CREATE POLICY "Agents update leads" ON leads FOR UPDATE USING (agency_id = get_my_agency_id());

    -- lead_qualifications
    DROP POLICY IF EXISTS "Users can view qualifications in their agency" ON lead_qualifications;
    CREATE POLICY "Users can view qualifications in their agency" ON lead_qualifications FOR SELECT USING (agency_id = get_my_agency_id());
    
    DROP POLICY IF EXISTS "Users can insert qualifications in their agency" ON lead_qualifications;
    CREATE POLICY "Users can insert qualifications in their agency" ON lead_qualifications FOR INSERT WITH CHECK (agency_id = get_my_agency_id());

    DROP POLICY IF EXISTS "Users can update qualifications in their agency" ON lead_qualifications;
    CREATE POLICY "Users can update qualifications in their agency" ON lead_qualifications FOR UPDATE USING (agency_id = get_my_agency_id());

    DROP POLICY IF EXISTS "Users can delete qualifications in their agency" ON lead_qualifications;
    CREATE POLICY "Users can delete qualifications in their agency" ON lead_qualifications FOR DELETE USING (agency_id = get_my_agency_id());

    -- universities
    DROP POLICY IF EXISTS "Users can view universities in their agency" ON universities;
    CREATE POLICY "Users can view universities in their agency" ON universities FOR SELECT USING (agency_id = get_my_agency_id());

    DROP POLICY IF EXISTS "Users can manage universities in their agency" ON universities;
    CREATE POLICY "Users can manage universities in their agency" ON universities FOR ALL USING (
        agency_id = get_my_agency_id() AND get_my_role() IN ('super_admin', 'agency_admin')
    );

    -- university_courses
    DROP POLICY IF EXISTS "Users can view courses in their agency" ON university_courses;
    CREATE POLICY "Users can view courses in their agency" ON university_courses FOR SELECT USING (agency_id = get_my_agency_id());

    DROP POLICY IF EXISTS "Users can manage courses in their agency" ON university_courses;
    CREATE POLICY "Users can manage courses in their agency" ON university_courses FOR ALL USING (
        agency_id = get_my_agency_id() AND get_my_role() IN ('super_admin', 'agency_admin')
    );
END $$;
