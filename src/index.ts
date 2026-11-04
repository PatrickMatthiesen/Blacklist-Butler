import { Client, IntentsBitField } from "discord.js";
import { dispatchInteraction, registerGuildCommands } from './commands/index.js';
import { initializeStoreBackend } from './stores/store-bootstrap.js';

// set client token
const token = process.env.DISCORD_TOKEN ?? '';

// Create a new client instance
const client = new Client({
	intents: [
		IntentsBitField.Flags.Guilds,
		IntentsBitField.Flags.GuildMessages,
	],
});

Bun.serve({
	fetch(): Response | Promise<Response> {
		const message = client.isReady() ? 'Hi i should be running' : 'I am trying to start up...';
		return new Response(message);
	},

	// Optional port number - the default value is 3000
	port: process.env.PORT || 3000
});

// When the client is ready, run this code (only once)
client.once('clientReady', readyClient => {
	registerGuildCommands(readyClient).then(() => {
		console.log("Bot started!");
	}).catch(error => {
		console.error('Failed to register guild commands:', error);
	});
});

client.on("interactionCreate", interaction => {
	dispatchInteraction(interaction).catch(error => {
		console.error('Failed to execute command:', error);
	});
});

async function run() {
	try {
		initializeStoreBackend();
	} catch (error) {
		console.error('Failed to initialize storage backend:', error);
		process.exit(1);
	}

	await client.login(token); // provide your bot token
}

await run();

export { client };
