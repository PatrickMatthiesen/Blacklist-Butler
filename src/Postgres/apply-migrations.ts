import { join } from 'node:path';
import { getPostgresClient, validatePostgresConfiguration } from './postgres-client.js';

async function run() {
    validatePostgresConfiguration();

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
