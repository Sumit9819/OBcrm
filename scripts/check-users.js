const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Read .env.local manually
const env = fs.readFileSync('.env.local', 'utf8')
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1]
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1]

const supabase = createClient(url, key)

async function checkUsers() {
    console.log("Checking remote users...")
    const { data, error } = await supabase.from('users').select('email, role')
    if (error) {
        console.error("Error:", error.message)
    } else {
        console.log("Existing Users:", data)
    }
}

checkUsers()
