const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function setupAgency() {
    console.log("Creating default agency...");
    const { data: agency, error: agencyErr } = await supabase
        .from('agencies')
        .insert({ company_name: 'GrowthCRM Default Agency' })
        .select()
        .single();

    if (agencyErr) {
        console.error("Failed to create agency:", agencyErr);
        return;
    }

    console.log("Agency created:", agency.id);

    console.log("Assigning users without an agency to the new agency...");
    const { data: users, error: userErr } = await supabase
        .from('users')
        .update({ agency_id: agency.id })
        .is('agency_id', null)
        .select();

    if (userErr) {
        console.error("Failed to update users:", userErr);
    } else {
        console.log(`Updated ${users ? users.length : 0} users.`);
    }
}

setupAgency();
