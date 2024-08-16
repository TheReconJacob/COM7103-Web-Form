import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wxjmxphdkmhgthgnizkv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4am14cGhka21oZ3RoZ25pemt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI2MDI4MjgsImV4cCI6MjAzODE3ODgyOH0.23RLOOXWXYOKLNIv2ApUnx_VV7Af1Vp2y9WvtsOdhVs';

export const supabase = createClient(supabaseUrl, supabaseKey);