import { FirebaseBlacklistStore } from '../Firebase/firebase-blacklist-store.js';
import { BlacklistStore } from '../interfaces/blacklist-store.js';
import { LocalBlacklistStore } from '../objects/local-blacklist-store.js';
import { SupabaseBlacklistStore } from '../Supabase/supabase-blacklist-store.js';
import { resolveStoreType } from './store-type.js';

export function createBlacklistStore(guildId: string): BlacklistStore {
    const storeType = resolveStoreType();

    if (storeType === 'firebase') {
        return new FirebaseBlacklistStore(guildId);
    }

    if (storeType === 'supabase') {
        return new SupabaseBlacklistStore(guildId);
    }

    return new LocalBlacklistStore(guildId);
}
