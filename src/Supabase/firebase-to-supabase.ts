import { Message } from 'discord.js';
import { getStorage } from 'firebase-admin/storage';
import { readFirebaseText } from '../Firebase/firebase-read.js';
import { initializeFirebaseAppFromEnvironment } from '../stores/store-bootstrap.js';
import { getSupabaseClient, validateSupabaseConfiguration } from './supabase-client.js';
import { SupabaseBlacklistStore } from './supabase-blacklist-store.js';

type GuildFiles = Map<string, Map<string, string>>;

async function assertSupabaseSchemaReady() {
    const supabase = getSupabaseClient();
    const requiredTables = [
        'blacklist_guilds',
        'blacklist_sections',
        'blacklist_entries',
        'blacklist_message_refs',
        'blacklist_config_entries',
        'blacklist_named_documents',
    ];

    for (const table of requiredTables) {
        const result = await supabase
            .from(table)
            .select('*', { head: true, count: 'exact' })
            .limit(1);

        if (result.error) {
            throw new Error(
                `Supabase schema is not ready: table public.${table} is unavailable. Run supabase/schema.sql against the project referenced by SUPABASE_URL, then retry. Original error: ${result.error.message}`
            );
        }
    }
}

async function readFirebaseJson(path: string) {
    return readFirebaseText(path);
}

async function listGuildFiles(): Promise<GuildFiles> {
    const storage = getStorage();
    const [files] = await storage.bucket().getFiles({ prefix: 'guilds/' });
    const groupedFiles: GuildFiles = new Map();

    for (const file of files) {
        const match = /^guilds\/([^/]+)\/([^/]+)\.json$/u.exec(file.name);
        if (!match) {
            continue;
        }

        const guildId = match[1];
        const documentName = match[2];
        const guildFiles = groupedFiles.get(guildId) ?? new Map<string, string>();
        guildFiles.set(documentName, file.name);
        groupedFiles.set(guildId, guildFiles);
    }

    return groupedFiles;
}

async function migrateGuild(guildId: string, files: Map<string, string>) {
    const store = new SupabaseBlacklistStore(guildId);

    const blacklistPath = files.get('Blacklist');
    if (blacklistPath) {
        const blacklist = new Map<string, string[]>(JSON.parse(await readFirebaseJson(blacklistPath)));
        await store.saveBlacklist(blacklist);
    }

    const messagesPath = files.get('messages');
    if (messagesPath) {
        const messages = new Map<string, Message<boolean>>(JSON.parse(await readFirebaseJson(messagesPath)));
        await store.saveMessages(messages);
    }

    const configPath = files.get('config');
    if (configPath) {
        const config = new Map<string, string>(JSON.parse(await readFirebaseJson(configPath)));
        await store.saveConfig(config);
    }

    for (const [documentName, path] of files.entries()) {
        if (documentName === 'Blacklist' || documentName === 'messages' || documentName === 'config') {
            continue;
        }

        await store.saveByName(documentName, await readFirebaseJson(path));
    }
}

async function run() {
    initializeFirebaseAppFromEnvironment();
    validateSupabaseConfiguration();
    getSupabaseClient();
    await assertSupabaseSchemaReady();

    const guildFiles = await listGuildFiles();
    console.log(`Found ${guildFiles.size} guilds in Firebase storage`);

    let migratedCount = 0;
    let failedCount = 0;

    for (const [guildId, files] of guildFiles.entries()) {
        try {
            console.log(`Migrating guild ${guildId}`);
            await migrateGuild(guildId, files);
            migratedCount += 1;
            console.log(`Migrated guild ${guildId}`);
        } catch (error) {
            failedCount += 1;
            console.error(`Failed to migrate guild ${guildId}`, error);
        }
    }

    console.log(`Migration finished. Migrated=${migratedCount}, Failed=${failedCount}`);

    if (failedCount > 0) {
        process.exit(1);
    }
}

await run();
