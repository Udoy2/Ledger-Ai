const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("No supabase env vars");
    return;
  }
  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('signals')
    .select('id, type, raw_text, collected_at')
    .eq('source', 'google_analytics')
    .order('collected_at', { ascending: false });

  if (error) {
    console.error("DB error:", error.message);
    return;
  }

  console.log(`Found ${data.length} google_analytics signals in the database:`);
  data.forEach((s, idx) => {
    console.log(`[${idx + 1}] Type: ${s.type} | Date: ${s.collected_at}`);
    console.log(`    Text: "${s.raw_text}"`);
  });
}

check();
