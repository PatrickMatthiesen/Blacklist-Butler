import { join } from 'node:path';
import { SQL } from 'bun';
import {
    getPostgresAdminConnectionConfig,
    getPostgresClient,
    getPostgresDatabaseName,
    validatePostgresConfiguration,
} from './postgres-client.js';

async function ensureDatabaseExists() {
    const databaseName = getPostgresDatabaseName();
    const adminSql = new SQL({
        ...getPostgresAdminConnectionConfig(),
        idleTimeout: 5,
        max: 1,
    });

    console.log(`Ensuring PostgreSQL database "${databaseName}" exists`);

    try {
        const existingDatabase = await adminSql`select 1 from pg_database where datname = ${databaseName}`;

        if (existingDatabase.length === 0) {
            console.log(`Creating PostgreSQL database ${databaseName}`);
            await adminSql.unsafe(`CREATE DATABASE ${quotePostgresIdentifier(databaseName)}`);
        }
    } catch (error) {
        console.error('Error ensuring PostgreSQL database exists:', error);
        throw error;
    } finally {
        await adminSql.close();
    }
}

function quotePostgresIdentifier(value: string) {
    return `"${value.replaceAll('"', '""')}"`;
}

async function run() {
    validatePostgresConfiguration();
    await ensureDatabaseExists();

    const sql = getPostgresClient();
    const schemaPath = join(process.cwd(), 'src', 'Postgres', 'schema.sql');

    console.log(`Applying PostgreSQL schema from ${schemaPath}`);
    await sql.file(schemaPath);
    console.log('PostgreSQL schema is ready');
}

try {
    await run();
} finally {
    await getPostgresClient().close();
}
