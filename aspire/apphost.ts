// Aspire TypeScript AppHost
// For more information, see: https://aspire.dev

import { createBuilder } from './.modules/aspire.js';

const builder = await createBuilder();

await builder.addDockerComposeEnvironment('docker-compose')
    .withDashboard({ enabled: false });

const discordToken = await builder.addParameter('discord-token', { secret: true });

const postgres = await builder.addPostgres('postgres')
    .withDataVolume()
    .withPgAdmin()
    .addDatabase('blacklist-butler');

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
    .publishAsDockerFile(async () => { })
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
