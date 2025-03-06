// db/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = "https://wcionosyeqklnnknmkjz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjaW9ub3N5ZXFrbG5ua25ta2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNDA3NTcsImV4cCI6MjA1NjgxNjc1N30.jX9qRIBpj9Rr2ttPKV0Uj-SyKHDYE13bRaca-A5XnBM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
