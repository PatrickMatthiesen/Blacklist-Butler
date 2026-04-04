import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { validateSupabaseConfiguration } from '../Supabase/supabase-client.js';
import { resolveStoreType } from './store-type.js';

export function initializeStoreBackend(env: NodeJS.ProcessEnv = process.env) {
    const storeType = resolveStoreType(env);

    if (storeType === 'firebase') {
        initializeFirebaseAppFromEnvironment(env);
        return;
    }

    if (storeType === 'supabase') {
        validateSupabaseConfiguration(env);
    }
}

export function initializeFirebaseAppFromEnvironment(env: NodeJS.ProcessEnv = process.env) {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    const bucket = env.FIREBASE_STORAGE_BUCKET;
    if (!bucket) {
        throw new Error('FIREBASE_STORAGE_BUCKET is missing');
    }

    const b64 = env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (b64) {
        const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
        return initializeApp({ credential: cert(json), storageBucket: bucket });
    }

    if (env.GOOGLE_APPLICATION_CREDENTIALS) {
        return initializeApp({ credential: applicationDefault(), storageBucket: bucket });
    }

    throw new Error('Firebase credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_BASE64 or GOOGLE_APPLICATION_CREDENTIALS.');
}