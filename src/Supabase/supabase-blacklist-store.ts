import { Message } from 'discord.js';
import { BlacklistStore } from '../interfaces/blacklist-store.js';
import { getSupabaseClient } from './supabase-client.js';

type SectionRow = {
    category: string;
    header: string;
};

type EntryRow = {
    category: string;
    position: number;
    entry_value: string;
};

type MessageRow = {
    category: string;
    payload: object;
};

type ConfigRow = {
    config_key: string;
    config_value: string;
};

type NamedDocumentRow = {
    payload_text: string;
    payload_encoding: 'utf-8' | 'base64';
};

export class SupabaseBlacklistStore implements BlacklistStore {
    private guildId: string;

    constructor(guildId: string) {
        this.guildId = guildId;
    }

    async load(): Promise<{ blacklist: Map<string, string[]>; messages: Map<string, Message<boolean>>; }> {
        return {
            blacklist: await this.loadBlacklist(),
            messages: await this.loadMessages(),
        };
    }

    async loadBlacklist(): Promise<Map<string, string[]>> {
        const supabase = getSupabaseClient();
        const [sectionsResult, entriesResult] = await Promise.all([
            supabase
                .from('blacklist_sections')
                .select('category, header')
                .eq('guild_id', this.guildId)
                .order('category', { ascending: true }),
            supabase
                .from('blacklist_entries')
                .select('category, position, entry_value')
                .eq('guild_id', this.guildId)
                .order('category', { ascending: true })
                .order('position', { ascending: true }),
        ]);

        this.throwOnError('load blacklist sections', sectionsResult.error);
        this.throwOnError('load blacklist entries', entriesResult.error);

        const blacklist = new Map<string, string[]>();

        for (const section of (sectionsResult.data ?? []) as SectionRow[]) {
            blacklist.set(section.category, [section.header]);
        }

        for (const entry of (entriesResult.data ?? []) as EntryRow[]) {
            const list = blacklist.get(entry.category) ?? [];
            list.push(entry.entry_value);
            blacklist.set(entry.category, list);
        }

        return new Map([...blacklist.entries()].sort(([left], [right]) => left.localeCompare(right)));
    }

    async loadMessages(): Promise<Map<string, Message>> {
        const supabase = getSupabaseClient();
        const result = await supabase
            .from('blacklist_message_refs')
            .select('category, payload')
            .eq('guild_id', this.guildId)
            .order('category', { ascending: true });

        this.throwOnError('load message refs', result.error);

        return new Map(
            ((result.data ?? []) as MessageRow[]).map(row => [row.category, row.payload as Message<boolean>])
        );
    }

    async loadConfig(): Promise<Map<string, string>> {
        const supabase = getSupabaseClient();
        const result = await supabase
            .from('blacklist_config_entries')
            .select('config_key, config_value')
            .eq('guild_id', this.guildId)
            .order('config_key', { ascending: true });

        this.throwOnError('load config entries', result.error);

        return new Map(
            ((result.data ?? []) as ConfigRow[]).map(row => [row.config_key, row.config_value])
        );
    }

    async loadByName(name: string): Promise<string | null> {
        const supabase = getSupabaseClient();
        const result = await supabase
            .from('blacklist_named_documents')
            .select('payload_text, payload_encoding')
            .eq('guild_id', this.guildId)
            .eq('document_name', name)
            .maybeSingle();

        this.throwOnError(`load named document ${name}`, result.error);

        if (!result.data) {
            return null;
        }

        const row = result.data as NamedDocumentRow;
        if (row.payload_encoding === 'base64') {
            return Buffer.from(row.payload_text, 'base64').toString('utf-8');
        }

        return row.payload_text;
    }

    async save(blacklist: Map<string, string[]>, messages: Map<string, Message>) {
        await this.saveBlacklist(blacklist);
        await this.saveMessages(messages);
    }

    async saveBlacklist(blacklist: Map<string, string[]>): Promise<void> {
        const supabase = getSupabaseClient();
        await this.ensureGuildRow();

        const sections = new Array<{ guild_id: string; category: string; header: string; }>();
        const entries = new Array<{ guild_id: string; category: string; position: number; entry_value: string; }>();

        for (const [category, values] of blacklist.entries()) {
            const [header, ...names] = values;
            sections.push({
                guild_id: this.guildId,
                category,
                header: header ?? category,
            });

            names.forEach((entryValue, index) => {
                entries.push({
                    guild_id: this.guildId,
                    category,
                    position: index,
                    entry_value: entryValue,
                });
            });
        }

        const deleteEntriesResult = await supabase
            .from('blacklist_entries')
            .delete()
            .eq('guild_id', this.guildId);
        this.throwOnError('delete blacklist entries', deleteEntriesResult.error);

        const deleteSectionsResult = await supabase
            .from('blacklist_sections')
            .delete()
            .eq('guild_id', this.guildId);
        this.throwOnError('delete blacklist sections', deleteSectionsResult.error);

        if (sections.length > 0) {
            const insertSectionsResult = await supabase
                .from('blacklist_sections')
                .insert(sections);
            this.throwOnError('insert blacklist sections', insertSectionsResult.error);
        }

        if (entries.length > 0) {
            const insertEntriesResult = await supabase
                .from('blacklist_entries')
                .insert(entries);
            this.throwOnError('insert blacklist entries', insertEntriesResult.error);
        }

        await this.touchGuild();
    }

    async saveMessages(messages: Map<string, Message<boolean>>) {
        const supabase = getSupabaseClient();
        await this.ensureGuildRow();

        const deleteResult = await supabase
            .from('blacklist_message_refs')
            .delete()
            .eq('guild_id', this.guildId);
        this.throwOnError('delete message refs', deleteResult.error);

        const rows = [...messages.entries()].map(([category, payload]) => ({
            guild_id: this.guildId,
            category,
            message_id: payload.id,
            payload,
        }));

        if (rows.length > 0) {
            const insertResult = await supabase
                .from('blacklist_message_refs')
                .insert(rows);
            this.throwOnError('insert message refs', insertResult.error);
        }

        await this.touchGuild();
    }

    async saveConfig(config: Map<string, string>) {
        const supabase = getSupabaseClient();
        await this.ensureGuildRow();

        const deleteResult = await supabase
            .from('blacklist_config_entries')
            .delete()
            .eq('guild_id', this.guildId);
        this.throwOnError('delete config entries', deleteResult.error);

        const rows = [...config.entries()].map(([configKey, configValue]) => ({
            guild_id: this.guildId,
            config_key: configKey,
            config_value: configValue,
        }));

        if (rows.length > 0) {
            const insertResult = await supabase
                .from('blacklist_config_entries')
                .insert(rows);
            this.throwOnError('insert config entries', insertResult.error);
        }

        await this.touchGuild();
    }

    async saveByName(name: string, data: string | Buffer) {
        const supabase = getSupabaseClient();
        await this.ensureGuildRow();

        const payloadEncoding = Buffer.isBuffer(data) ? 'base64' : 'utf-8';
        const payloadText = Buffer.isBuffer(data) ? data.toString('base64') : data;

        const result = await supabase
            .from('blacklist_named_documents')
            .upsert({
                guild_id: this.guildId,
                document_name: name,
                payload_text: payloadText,
                payload_encoding: payloadEncoding,
            }, {
                onConflict: 'guild_id,document_name',
            });

        this.throwOnError(`upsert named document ${name}`, result.error);
        await this.touchGuild();
    }

    private async ensureGuildRow() {
        const supabase = getSupabaseClient();
        const timestamp = new Date().toISOString();
        const result = await supabase
            .from('blacklist_guilds')
            .upsert({
                guild_id: this.guildId,
                updated_at: timestamp,
            }, {
                onConflict: 'guild_id',
            });

        this.throwOnError('upsert guild row', result.error);
    }

    private async touchGuild() {
        const supabase = getSupabaseClient();
        const result = await supabase
            .from('blacklist_guilds')
            .update({
                updated_at: new Date().toISOString(),
            })
            .eq('guild_id', this.guildId);

        this.throwOnError('touch guild row', result.error);
    }

    private throwOnError(operation: string, error: Error | null) {
        if (error) {
            throw new Error(`Supabase store failed to ${operation} for guild ${this.guildId}: ${this.formatSupabaseError(error)}`);
        }
    }

    private formatSupabaseError(error: Error) {
        if (error.message.includes("Could not find the table 'public.blacklist_guilds' in the schema cache")) {
            return "Supabase table public.blacklist_guilds is missing from the target project. Run supabase/schema.sql against the same project referenced by SUPABASE_URL and retry. If you just created the tables, wait a few seconds and retry so the schema cache refreshes.";
        }

        return error.message;
    }
}
