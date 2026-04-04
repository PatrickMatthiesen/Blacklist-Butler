export const supportedStoreTypes = ['local', 'firebase', 'supabase'] as const;

export type StoreType = (typeof supportedStoreTypes)[number];

function isStoreType(value: string): value is StoreType {
    return supportedStoreTypes.includes(value as StoreType);
}

export function resolveStoreType(env: NodeJS.ProcessEnv = process.env): StoreType {
    const configured = env.STORE_TYPE?.trim().toLowerCase();

    if (configured) {
        if (isStoreType(configured)) {
            return configured;
        }

        throw new Error(`Unsupported STORE_TYPE "${env.STORE_TYPE}". Expected one of: ${supportedStoreTypes.join(', ')}`);
    }

    if (env.GOOGLE_APPLICATION_CREDENTIALS || env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        return 'firebase';
    }

    return 'local';
}
