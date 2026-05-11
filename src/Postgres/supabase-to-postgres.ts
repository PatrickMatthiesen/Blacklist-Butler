import { getSupabaseClient, validateSupabaseConfiguration } from '../Supabase/supabase-client.js';
import { getPostgresClient, validatePostgresConfiguration } from './postgres-client.js';

type TableName =
    | 'blacklist_guilds'
    | 'blacklist_sections'
    | 'blacklist_entries'
    | 'blacklist_message_refs'
    | 'blacklist_config_entries'
    | 'blacklist_named_documents';

type BlacklistGuildRow = {
    guild_id: string;
    created_at: string;
    updated_at: string;
};

type BlacklistSectionRow = {
    guild_id: string;
    category: string;
    header: string;
};

type BlacklistEntryRow = {
    guild_id: string;
    category: string;
    position: number;
    entry_value: string;
};

type BlacklistMessageRefRow = {
    guild_id: string;
    category: string;
    message_id: string;
    payload: unknown;
};

type BlacklistConfigEntryRow = {
    guild_id: string;
    config_key: string;
    config_value: string;
};

type BlacklistNamedDocumentRow = {
    guild_id: string;
    document_name: string;
    payload_text: string;
    payload_encoding: 'utf-8' | 'base64';
};

type MigrationCounts = Record<TableName, number>;

const pageSize = Number.parseInt(process.env.SUPABASE_MIGRATION_PAGE_SIZE ?? '1000', 10);
const replaceDestination = process.argv.includes('--replace');

const tableOrder: TableName[] = [
    'blacklist_guilds',
    'blacklist_sections',
    'blacklist_entries',
    'blacklist_message_refs',
    'blacklist_config_entries',
    'blacklist_named_documents',
];

if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error('SUPABASE_MIGRATION_PAGE_SIZE must be a positive integer');
}

async function assertSupabaseSchemaReady() {
    const supabase = getSupabaseClient();

    for (const table of tableOrder) {
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

async function assertPostgresSchemaReady() {
    const sql = getPostgresClient();

    for (const table of tableOrder) {
        try {
            await sql`select 1 from ${sql(table)} limit 1`;
        } catch (error) {
            throw new Error(
                `PostgreSQL schema is not ready: table ${table} is unavailable. Run src/Postgres/schema.sql against the configured Postgres connection, then retry. Original error: ${formatError(error)}`
            );
        }
    }
}

async function fetchAllRows<Row>(table: TableName, columns: string, orderColumns: string[]) {
    const supabase = getSupabaseClient();
    const rows: Row[] = [];
    let from = 0;

    while (true) {
        const to = from + pageSize - 1;
        let query = supabase
            .from(table)
            .select(columns)
            .range(from, to);

        for (const column of orderColumns) {
            query = query.order(column, { ascending: true });
        }

        const result = await query;

        if (result.error) {
            throw new Error(`Failed to read Supabase table public.${table}: ${result.error.message}`);
        }

        const page = (result.data ?? []) as Row[];
        rows.push(...page);

        if (page.length < pageSize) {
            return rows;
        }

        from += pageSize;
    }
}

async function replacePostgresRows() {
    const sql = getPostgresClient();

    await sql`
        truncate table
            blacklist_named_documents,
            blacklist_config_entries,
            blacklist_message_refs,
            blacklist_entries,
            blacklist_sections,
            blacklist_guilds
        restart identity cascade
    `;
}

async function copyGuilds(rows: BlacklistGuildRow[]) {
    const sql = getPostgresClient();

    for (const row of rows) {
        await sql`
            insert into blacklist_guilds (guild_id, created_at, updated_at)
            values (${row.guild_id}, ${row.created_at}, ${row.updated_at})
            on conflict (guild_id)
            do update set
                created_at = excluded.created_at,
                updated_at = excluded.updated_at
        `;
    }
}

async function copySections(rows: BlacklistSectionRow[]) {
    const sql = getPostgresClient();

    for (const row of rows) {
        await sql`
            insert into blacklist_sections (guild_id, category, header)
            values (${row.guild_id}, ${row.category}, ${row.header})
            on conflict (guild_id, category)
            do update set header = excluded.header
        `;
    }
}

async function copyEntries(rows: BlacklistEntryRow[]) {
    const sql = getPostgresClient();

    for (const row of rows) {
        await sql`
            insert into blacklist_entries (guild_id, category, position, entry_value)
            values (${row.guild_id}, ${row.category}, ${row.position}, ${row.entry_value})
            on conflict (guild_id, category, position)
            do update set entry_value = excluded.entry_value
        `;
    }
}

async function copyMessageRefs(rows: BlacklistMessageRefRow[]) {
    const sql = getPostgresClient();

    for (const row of rows) {
        const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) as unknown : row.payload;

        await sql`
            insert into blacklist_message_refs (guild_id, category, message_id, payload)
            values (${row.guild_id}, ${row.category}, ${row.message_id}, cast(cast(${JSON.stringify(payload)} as text) as jsonb))
            on conflict (guild_id, category)
            do update set
                message_id = excluded.message_id,
                payload = excluded.payload
        `;
    }
}

async function copyConfigEntries(rows: BlacklistConfigEntryRow[]) {
    const sql = getPostgresClient();

    for (const row of rows) {
        await sql`
            insert into blacklist_config_entries (guild_id, config_key, config_value)
            values (${row.guild_id}, ${row.config_key}, ${row.config_value})
            on conflict (guild_id, config_key)
            do update set config_value = excluded.config_value
        `;
    }
}

async function copyNamedDocuments(rows: BlacklistNamedDocumentRow[]) {
    const sql = getPostgresClient();

    for (const row of rows) {
        await sql`
            insert into blacklist_named_documents (guild_id, document_name, payload_text, payload_encoding)
            values (${row.guild_id}, ${row.document_name}, ${row.payload_text}, ${row.payload_encoding})
            on conflict (guild_id, document_name)
            do update set
                payload_text = excluded.payload_text,
                payload_encoding = excluded.payload_encoding
        `;
    }
}

async function runMigration() {
    validateSupabaseConfiguration();
    validatePostgresConfiguration();

    await assertSupabaseSchemaReady();
    await assertPostgresSchemaReady();

    const counts: MigrationCounts = {
        blacklist_guilds: 0,
        blacklist_sections: 0,
        blacklist_entries: 0,
        blacklist_message_refs: 0,
        blacklist_config_entries: 0,
        blacklist_named_documents: 0,
    };

    if (replaceDestination) {
        console.log('Replacing destination PostgreSQL rows before migration');
        await replacePostgresRows();
    }

    const guilds = await fetchAllRows<BlacklistGuildRow>('blacklist_guilds', 'guild_id, created_at, updated_at', ['guild_id']);
    await copyGuilds(guilds);
    counts.blacklist_guilds = guilds.length;

    const sections = await fetchAllRows<BlacklistSectionRow>('blacklist_sections', 'guild_id, category, header', ['guild_id', 'category']);
    await copySections(sections);
    counts.blacklist_sections = sections.length;

    const entries = await fetchAllRows<BlacklistEntryRow>('blacklist_entries', 'guild_id, category, position, entry_value', ['guild_id', 'category', 'position']);
    await copyEntries(entries);
    counts.blacklist_entries = entries.length;

    const messageRefs = await fetchAllRows<BlacklistMessageRefRow>('blacklist_message_refs', 'guild_id, category, message_id, payload', ['guild_id', 'category']);
    await copyMessageRefs(messageRefs);
    counts.blacklist_message_refs = messageRefs.length;

    const configEntries = await fetchAllRows<BlacklistConfigEntryRow>('blacklist_config_entries', 'guild_id, config_key, config_value', ['guild_id', 'config_key']);
    await copyConfigEntries(configEntries);
    counts.blacklist_config_entries = configEntries.length;

    const namedDocuments = await fetchAllRows<BlacklistNamedDocumentRow>('blacklist_named_documents', 'guild_id, document_name, payload_text, payload_encoding', ['guild_id', 'document_name']);
    await copyNamedDocuments(namedDocuments);
    counts.blacklist_named_documents = namedDocuments.length;

    console.log('Supabase to PostgreSQL migration finished');
    for (const [table, count] of Object.entries(counts)) {
        console.log(`${table}: ${count}`);
    }
}

function formatError(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

try {
    await runMigration();
} finally {
    await getPostgresClient().close();
}
