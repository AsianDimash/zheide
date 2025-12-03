import { createClient } from '@supabase/supabase-js';

// Supabase project details (matches src/services/supabaseClient.ts)
const SUPABASE_URL = 'https://moerekfdhptpuomvufsj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZXJla2ZkaHB0cHVvbXZ1ZnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5Mzg2ODksImV4cCI6MjA3OTUxNDY4OX0.IJmxPHkX8CIHpY3Y5L8xSA5j9giYoM_QqD4rfERp6eo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fetchLogs() {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Error fetching logs:', error);
      process.exitCode = 2;
      return;
    }

    console.log(JSON.stringify(data || [], null, 2));
  } catch (e) {
    console.error('Unexpected error:', e);
    process.exitCode = 2;
  }
}

await fetchLogs();
