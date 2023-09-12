import { BlacklistStore } from "../interfaces/blacklist-store.js";

export async function setGuildBlPrefix(guildId: string, prefix: string, store: BlacklistStore) {
    const config = await store.loadConfig();
    if (config) {
        config?.set('blPrefix', prefix);
        await store.saveConfig(config);
        return true;
    }
    return false;
}