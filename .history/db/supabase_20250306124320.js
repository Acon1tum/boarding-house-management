// db/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = "https://ucskgzyiufvooylkdqfi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjc2tnenlpdWZ2b295bGtkcWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzQ4NzYsImV4cCI6MjA1NjgxMDg3Nn0.6U5ov63_qHl3XxTgbCNjqeDxppaSSMcC-xHZQjZ86Ik";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
