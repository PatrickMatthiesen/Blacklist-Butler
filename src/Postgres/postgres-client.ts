import { SQL } from 'bun';

type PostgresConnectionConfig = SQL.Options;

const aspireConnectionStringName = 'ConnectionStrings__blacklist-butler';

let postgresClient: SQL | null = null;

function getPostgresConnectionConfig(env: NodeJS.ProcessEnv = process.env): PostgresConnectionConfig {
    const aspireConnectionString = env[aspireConnectionStringName]?.trim();

    if (aspireConnectionString) {
        return parseAspirePostgresConnectionString(aspireConnectionString);
    }

    const databaseUrl = env.POSTGRES_URL?.trim() ?? env.DATABASE_URL?.trim() ?? env.PGURL?.trim() ?? env.PG_URL?.trim();

    if (!databaseUrl) {
        throw new Error(`STORE_TYPE=postgres but ${aspireConnectionStringName}, POSTGRES_URL, DATABASE_URL, PGURL, or PG_URL is missing`);
    }

    return { url: databaseUrl };
}

export function getPostgresDatabaseName(env: NodeJS.ProcessEnv = process.env) {
    const connectionConfig = getPostgresConnectionConfig(env);

    if ('database' in connectionConfig && typeof connectionConfig.database === 'string' && connectionConfig.database) {
        return connectionConfig.database;
    }

    if ('url' in connectionConfig && typeof connectionConfig.url === 'string') {
        const databaseName = new URL(connectionConfig.url).pathname.slice(1);

        if (databaseName) {
            return databaseName;
        }
    }

    throw new Error(`${aspireConnectionStringName} must include a database name`);
}

export function getPostgresAdminConnectionConfig(env: NodeJS.ProcessEnv = process.env): PostgresConnectionConfig {
    const connectionConfig = getPostgresConnectionConfig(env);

    if ('url' in connectionConfig && typeof connectionConfig.url === 'string') {
        const adminUrl = new URL(connectionConfig.url);
        adminUrl.pathname = '/postgres';
        return { url: adminUrl.toString() };
    }

    return {
        ...connectionConfig,
        database: 'postgres',
    };
}

export function validatePostgresConfiguration(env: NodeJS.ProcessEnv = process.env) {
    getPostgresConnectionConfig(env);
}

export function getPostgresClient(env: NodeJS.ProcessEnv = process.env) {
    if (!postgresClient) {
        postgresClient = new SQL({
            ...getPostgresConnectionConfig(env),
            idleTimeout: 20,
            max: 5,
        });
    }

    return postgresClient;
}

function parseAspirePostgresConnectionString(connectionString: string): PostgresConnectionConfig {
    const values = new Map<string, string>();

    for (const segment of connectionString.split(';')) {
        const separatorIndex = segment.indexOf('=');
        if (separatorIndex === -1) {
            continue;
        }

        const key = segment.slice(0, separatorIndex).trim().toLowerCase();
        const value = segment.slice(separatorIndex + 1).trim();

        if (key && value) {
            values.set(key, value);
        }
    }

    const hostname = values.get('host') ?? values.get('server');
    const database = values.get('database');
    const username = values.get('username') ?? values.get('user id') ?? values.get('userid') ?? values.get('user');
    const password = values.get('password');
    const port = values.get('port');

    if (!hostname || !database || !username) {
        throw new Error(`${aspireConnectionStringName} must include Host, Database, and Username`);
    }

    return {
        hostname,
        database,
        username,
        password,
        port: port ? parsePort(port) : undefined,
    };
}

function parsePort(port: string) {
    const parsedPort = Number.parseInt(port, 10);

    if (!Number.isInteger(parsedPort)) {
        throw new Error(`${aspireConnectionStringName} has an invalid Port value`);
    }

    return parsedPort;
}
