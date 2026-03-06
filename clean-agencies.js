const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanAgencies() {
    console.log("Cleaning invalid logo_urls in agencies table...");
    const { data: agencies, error } = await supabase
        .from('agencies')
        .select('id, logo_url');

    if (error) {
        console.error("Error fetching agencies:", error);
        return;
    }

    for (const agency of agencies || []) {
        if (agency.logo_url === '01.png' || agency.logo_url === '/01.png') {
            console.log(`Clearing logo_url for agency ${agency.id}`);
            await supabase
                .from('agencies')
                .update({ logo_url: null })
                .eq('id', agency.id);
        }
    }
    console.log("Clean up complete.");
}

cleanAgencies();
