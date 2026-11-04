// Aspire TypeScript AppHost
// For more information, see: https://aspire.dev

import { createBuilder } from './.aspire/modules/aspire.mjs';

const builder = await createBuilder();

await builder.addDockerComposeEnvironment('docker-compose')
    .withDashboard({ enabled: false });

const discordToken = await builder.addParameter('discord-token', { secret: true });

const postgresServer = await builder.addPostgres('postgres')
    // Production was migrated to this PostgreSQL 18 volume explicitly.
    // Keep the version and volume stable across Aspire upgrades.
    .withImageTag('18.3')
    .withDataVolume({ name: 'postgres18-data' })
    .withPgAdmin()
    .publishAsDockerComposeService(async (_, service) => {
        await service.restart.set('unless-stopped');
    });

const postgres = await postgresServer.addDatabase('blacklist-butler');

const applyMigrations = builder.addJavaScriptApp('apply-migrations', '..', {
    runScriptName: 'migrate:postgres-schema'
}).withBun()
    .publishAsDockerFile(async (container) => {
        await container.withEntrypoint('bun');
        await container.withArgs(['migrate:postgres-schema']);
    })
    .waitFor(postgres)
    .withReference(postgres);

const bot = builder.addJavaScriptApp("bot", "..")
    .withBun()
    .publishAsDockerFile(async (container) => {
        await container.withEntrypoint('bun');
        await container.withArgs(['src/index.ts']);
    })
    .publishAsDockerComposeService(async (_, service) => {
        await service.restart.set('unless-stopped');
    })
    .withEnvironment('DISCORD_TOKEN', discordToken)
    .withEnvironment('STORE_TYPE', 'postgres')
    .waitFor(postgres)
    .waitForCompletion(applyMigrations)
    .withReference(postgres);

if (await builder.environment().isDevelopment()) {
    await bot.withRunScript('dev');
} else {
    await bot.withRunScript('src/index.ts');
}

await builder.build().run();
