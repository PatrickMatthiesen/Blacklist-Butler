export const supportedStoreTypes = ['local', 'firebase', 'supabase', 'postgres'] as const;

export type StoreType = (typeof supportedStoreTypes)[number];

function isStoreType(value: string): value is StoreType {
    return supportedStoreTypes.includes(value as StoreType);
}

export function resolveStoreType(env: NodeJS.ProcessEnv = process.env): StoreType {
    const configured = env.STORE_TYPE?.trim().toLowerCase();

    if (configured) {
        if (isStoreType(configured)) {
            console.log(`Using STORE_TYPE: ${configured}`);
            return configured;
        }

        throw new Error(`Unsupported STORE_TYPE "${env.STORE_TYPE}". Expected one of: ${supportedStoreTypes.join(', ')}`);
    }

    if (env.GOOGLE_APPLICATION_CREDENTIALS || env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        console.log('Using store type: firebase (detected Google credentials)');
        return 'firebase';
    }

    console.log('Using store type: local (fallback)');
    return 'local';
}
