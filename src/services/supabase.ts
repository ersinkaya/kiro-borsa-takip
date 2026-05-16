import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Env'den okumayı dene, yoksa hardcoded değerleri kullan
// Anon key zaten public olduğu için repo'da bulunması güvenlik sorunu değil
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://qffqyeuwqmqrtemxxpdx.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZnF5ZXV3cW1xcnRlbXh4cGR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MzYzMDksImV4cCI6MjA5NDQxMjMwOX0.gdqgJCDGvxfuCWkeRQeLTt3ZqTtDZIMo4wNnL5nYSvQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
