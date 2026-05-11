import { Message } from 'discord.js';
import { type TransactionSQL } from 'bun';
import { BlacklistStore } from '../interfaces/blacklist-store.js';
import { getPostgresClient } from './postgres-client.js';

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
    message_id: string;
    payload: unknown;
};

type ConfigRow = {
    config_key: string;
    config_value: string;
};

type NamedDocumentRow = {
    payload_text: string;
    payload_encoding: 'utf-8' | 'base64';
};

export class PostgresBlacklistStore implements BlacklistStore {
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
        const sql = getPostgresClient();

        try {
            const [sections, entries] = await Promise.all([
                sql<SectionRow[]>`
                    select category, header
                    from blacklist_sections
                    where guild_id = ${this.guildId}
                    order by category asc
                `,
                sql<EntryRow[]>`
                    select category, position, entry_value
                    from blacklist_entries
                    where guild_id = ${this.guildId}
                    order by category asc, position asc
                `,
            ]);

            const blacklist = new Map<string, string[]>();

            for (const section of sections) {
                blacklist.set(section.category, [section.header]);
            }

            for (const entry of entries) {
                const list = blacklist.get(entry.category) ?? [];
                list.push(entry.entry_value);
                blacklist.set(entry.category, list);
            }

            return new Map([...blacklist.entries()].sort(([left], [right]) => left.localeCompare(right)));
        } catch (error) {
            return this.throwOnError('load blacklist', error);
        }
    }

    async loadMessages(): Promise<Map<string, Message>> {
        const sql = getPostgresClient();

        try {
            const rows = await sql<MessageRow[]>`
                select category, message_id, payload
                from blacklist_message_refs
                where guild_id = ${this.guildId}
                order by category asc
            `;

            return new Map(
                rows.map(row => [row.category, this.toMessagePayload(row)])
            );
        } catch (error) {
            return this.throwOnError('load message refs', error);
        }
    }

    async loadConfig(): Promise<Map<string, string>> {
        const sql = getPostgresClient();

        try {
            const rows = await sql<ConfigRow[]>`
                select config_key, config_value
                from blacklist_config_entries
                where guild_id = ${this.guildId}
                order by config_key asc
            `;

            return new Map(rows.map(row => [row.config_key, row.config_value]));
        } catch (error) {
            return this.throwOnError('load config entries', error);
        }
    }

    async loadByName(name: string): Promise<string | null> {
        const sql = getPostgresClient();

        try {
            const rows = await sql<NamedDocumentRow[]>`
                select payload_text, payload_encoding
                from blacklist_named_documents
                where guild_id = ${this.guildId}
                  and document_name = ${name}
                limit 1
            `;

            const row = rows[0];
            if (!row) {
                return null;
            }

            if (row.payload_encoding === 'base64') {
                return Buffer.from(row.payload_text, 'base64').toString('utf-8');
            }

            return row.payload_text;
        } catch (error) {
            return this.throwOnError(`load named document ${name}`, error);
        }
    }

    async save(blacklist: Map<string, string[]>, messages: Map<string, Message>) {
        await this.saveBlacklist(blacklist);
        await this.saveMessages(messages);
    }

    async saveBlacklist(blacklist: Map<string, string[]>): Promise<void> {
        const sections = new Array<{ category: string; header: string; }>();
        const entries = new Array<{ category: string; position: number; entryValue: string; }>();

        for (const [category, values] of blacklist.entries()) {
            const [header, ...names] = values;
            sections.push({
                category,
                header: header ?? category,
            });

            names.forEach((entryValue, index) => {
                entries.push({
                    category,
                    position: index,
                    entryValue,
                });
            });
        }

        await this.runInTransaction('save blacklist', async transaction => {
            await this.ensureGuildRow(transaction);

            await transaction`
                delete from blacklist_entries
                where guild_id = ${this.guildId}
            `;

            await transaction`
                delete from blacklist_sections
                where guild_id = ${this.guildId}
            `;

            for (const section of sections) {
                await transaction`
                    insert into blacklist_sections (guild_id, category, header)
                    values (${this.guildId}, ${section.category}, ${section.header})
                `;
            }

            for (const entry of entries) {
                await transaction`
                    insert into blacklist_entries (guild_id, category, position, entry_value)
                    values (${this.guildId}, ${entry.category}, ${entry.position}, ${entry.entryValue})
                `;
            }

            await this.touchGuild(transaction);
        });
    }

    async saveMessages(messages: Map<string, Message<boolean>>) {
        await this.runInTransaction('save message refs', async transaction => {
            await this.ensureGuildRow(transaction);

            await transaction`
                delete from blacklist_message_refs
                where guild_id = ${this.guildId}
            `;

            for (const [category, payload] of messages.entries()) {
                await transaction`
                    insert into blacklist_message_refs (guild_id, category, message_id, payload)
                    values (
                        ${this.guildId},
                        ${category},
                        ${payload.id},
                        cast(cast(${JSON.stringify(payload)} as text) as jsonb)
                    )
                `;
            }

            await this.touchGuild(transaction);
        });
    }

    async saveConfig(config: Map<string, string>) {
        await this.runInTransaction('save config entries', async transaction => {
            await this.ensureGuildRow(transaction);

            await transaction`
                delete from blacklist_config_entries
                where guild_id = ${this.guildId}
            `;

            for (const [configKey, configValue] of config.entries()) {
                await transaction`
                    insert into blacklist_config_entries (guild_id, config_key, config_value)
                    values (${this.guildId}, ${configKey}, ${configValue})
                `;
            }

            await this.touchGuild(transaction);
        });
    }

    async saveByName(name: string, data: string | Buffer) {
        const payloadEncoding = Buffer.isBuffer(data) ? 'base64' : 'utf-8';
        const payloadText = Buffer.isBuffer(data) ? data.toString('base64') : data;

        await this.runInTransaction(`save named document ${name}`, async transaction => {
            await this.ensureGuildRow(transaction);

            await transaction`
                insert into blacklist_named_documents (guild_id, document_name, payload_text, payload_encoding)
                values (${this.guildId}, ${name}, ${payloadText}, ${payloadEncoding})
                on conflict (guild_id, document_name)
                do update set
                    payload_text = excluded.payload_text,
                    payload_encoding = excluded.payload_encoding
            `;

            await this.touchGuild(transaction);
        });
    }

    private async ensureGuildRow(transaction: TransactionSQL) {
        await transaction`
            insert into blacklist_guilds (guild_id, updated_at)
            values (${this.guildId}, now())
            on conflict (guild_id)
            do update set updated_at = excluded.updated_at
        `;
    }

    private async touchGuild(transaction: TransactionSQL) {
        await transaction`
            update blacklist_guilds
            set updated_at = now()
            where guild_id = ${this.guildId}
        `;
    }

    private async runInTransaction(operation: string, callback: (transaction: TransactionSQL) => Promise<void>) {
        const sql = getPostgresClient();

        try {
            await sql.begin(async transaction => {
                await callback(transaction);
            });
        } catch (error) {
            this.throwOnError(operation, error);
        }
    }

    private throwOnError(operation: string, error: unknown): never {
        throw new Error(`Postgres store failed to ${operation} for guild ${this.guildId}: ${this.formatPostgresError(error)}`);
    }

    private formatPostgresError(error: unknown) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === '42P01') {
            return 'PostgreSQL schema is missing required tables. Run src/Postgres/schema.sql against the configured Postgres connection and retry.';
        }

        if (error instanceof Error) {
            return error.message;
        }

        return String(error);
    }

    private toMessagePayload(row: MessageRow) {
        const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) as Record<string, unknown> : row.payload as Record<string, unknown>;

        if (!payload.id) {
            payload.id = row.message_id;
        }

        return payload as unknown as Message<boolean>;
    }
}
