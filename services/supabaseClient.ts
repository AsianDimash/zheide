import { createClient } from '@supabase/supabase-js';

// Derived from the provided Anon Key token ref: moerekfdhptpuomvufsj
const SUPABASE_URL = 'https://moerekfdhptpuomvufsj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZXJla2ZkaHB0cHVvbXZ1ZnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5Mzg2ODksImV4cCI6MjA3OTUxNDY4OX0.IJmxPHkX8CIHpY3Y5L8xSA5j9giYoM_QqD4rfERp6eo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);