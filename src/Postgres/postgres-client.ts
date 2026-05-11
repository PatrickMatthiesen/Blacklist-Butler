import postgres, { Sql } from 'postgres';

let postgresClient: Sql | null = null;

function getDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
    const databaseUrl = env.DATABASE_URL?.trim();

    if (!databaseUrl) {
        throw new Error('STORE_TYPE=postgres but DATABASE_URL is missing');
    }

    return databaseUrl;
}

export function validatePostgresConfiguration(env: NodeJS.ProcessEnv = process.env) {
    getDatabaseUrl(env);
}

export function getPostgresClient(env: NodeJS.ProcessEnv = process.env) {
    if (!postgresClient) {
        postgresClient = postgres(getDatabaseUrl(env), {
            idle_timeout: 20,
            max: 5,
        });
    }

    return postgresClient;
}
