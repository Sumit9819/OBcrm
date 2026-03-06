const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    // Get an agency ID and user ID
    const { data: users, error: userError } = await supabase.from('users').select('id, agency_id, role').limit(1);
    if (userError || !users || users.length === 0) {
        console.error('No users found to test with', userError);
        return;
    }
    const user = users[0];

    // Try inserting
    const { data, error } = await supabase.from('calendar_events').insert({
        agency_id: user.agency_id,
        user_id: user.id,
        title: 'Test Event',
        description: 'Test description',
        start_at: new Date().toISOString(),
        event_type: 'event',
        color: '#6366f1'
    }).select();

    if (error) {
        console.error('INSERT FAILED:', error);
    } else {
        console.log('INSERT SUCCEEDED:', data);
    }
}

testInsert();
