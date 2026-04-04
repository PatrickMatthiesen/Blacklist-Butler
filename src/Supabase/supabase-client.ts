import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

function getSupabaseUrl(env: NodeJS.ProcessEnv = process.env) {
    const supabaseUrl = env.SUPABASE_URL?.trim();

    if (!supabaseUrl) {
        throw new Error('STORE_TYPE=supabase but SUPABASE_URL is missing');
    }

    return supabaseUrl;
}

function getSupabaseKey(env: NodeJS.ProcessEnv = process.env) {
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim() || env.SUPABASE_KEY?.trim();

    if (!supabaseKey) {
        throw new Error('STORE_TYPE=supabase but SUPABASE_SERVICE_ROLE_KEY is missing');
    }

    return supabaseKey;
}

export function validateSupabaseConfiguration(env: NodeJS.ProcessEnv = process.env) {
    getSupabaseUrl(env);
    getSupabaseKey(env);
}

export function getSupabaseClient(env: NodeJS.ProcessEnv = process.env) {
    if (!supabaseClient) {
        supabaseClient = createClient(getSupabaseUrl(env), getSupabaseKey(env), {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }

    return supabaseClient;
}