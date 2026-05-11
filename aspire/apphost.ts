import { ContainerLifetime, EndpointProperty, createBuilder, refExpr } from './.modules/aspire.js';

async function main() {
    const builder = await createBuilder();

    await builder.addDockerComposeEnvironment('compose');

    const discordToken = await builder.addParameter('discord-token', { secret: true });
    const postgres = await builder.addPostgres('postgres');
    await postgres.withLifetime(ContainerLifetime.Persistent);
    await postgres.withInitFiles('../postgres');

    const databaseName = 'blacklist_butler';
    const database = await postgres.addDatabase(databaseName);
    const postgresEndpoint = await postgres.getEndpoint('tcp');
    const postgresHost = await postgresEndpoint.property(EndpointProperty.Host);
    const postgresPort = await postgresEndpoint.property(EndpointProperty.Port);

    await builder
        .addDockerfile('blacklist-butler', '..')
        .withEnvironment('DISCORD_TOKEN', discordToken)
        .withEnvironment('STORE_TYPE', 'postgres')
        .withEnvironment(
            'DATABASE_URL',
            refExpr`postgres://${postgres.userNameParameter}:${postgres.passwordParameter}@${postgresHost}:${postgresPort}/${databaseName}`
        )
        .withEnvironment('NODE_ENV', 'production')
        .withHttpEndpoint({ env: 'PORT', targetPort: 3000, port: 3000 })
        .withExternalHttpEndpoints()
        .withReference(database)
        .waitFor(database);

    await builder.build().run();
}

await main();
