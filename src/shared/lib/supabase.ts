import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Server-side Supabase client with service role key.
 * Use for storage operations that require elevated permissions.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const PRODUCT_IMAGES_BUCKET = 'product-images';
