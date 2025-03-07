// Require the necessary discord.js classes
import "reflect-metadata";
import { Interaction, Message, IntentsBitField } from "discord.js";
import { Client } from "discordx";
import { importx } from "@discordx/importer";
import { applicationDefault, initializeApp } from "firebase-admin/app";

// set client token
const token = process.env.DISCORD_TOKEN ?? '';

// Create a new client instance
const client = new Client({
	simpleCommand: {
		prefix: "!"
	},
	intents: [
		IntentsBitField.Flags.Guilds,
		IntentsBitField.Flags.GuildMessages,
	],
	// uncoment this line to enable slash commands for all guilds and not only the ones registered when the bot was started
	botGuilds: [client => client.guilds.cache.map(g => g.id)], //new guilds wont have permissions nor will they have any commands as the bot will need a restart in its current state
	silent: false //console logs: on/off
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
client.once('ready', async () => {
	await client.guilds.fetch();

	// to create/update/delete discord application commands
	await client.initApplicationCommands();

	console.log("Bot started!");
});

client.on("interactionCreate", (interaction: Interaction) => {
	client.executeInteraction(interaction);
});

// has to be decorated with @SimpleCommand()
// https://discord-ts.js.org/docs/decorators/commands/simplecommand/
client.on('messageCreate', async (message: Message) => {
	client.executeCommand(message);
});

async function run() {
	await importx(import.meta.dirname + "/{events,commands}/**/*.{ts,js}");
	await client.login(token); // provide your bot token

	if (process.env.STORE_TYPE == 'firebase') {  // && process.env.GOOGLE_APPLICATION_CREDENTIALS
		if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
			console.error('Store_Type is firebase, but GOOGLE_APPLICATION_CREDENTIALS is not set');
			console.error('Please provide GOOGLE_APPLICATION_CREDENTIALS');
			return;
		}
		if (!process.env.FIREBASE_STORAGE_BUCKET) {
			console.error('Store_Type is firebase, but FIREBASE_STORAGE_BUCKET is not set');
			console.error('Please provide FIREBASE_STORAGE_BUCKET');
			return;
		}

		console.log('Store_Type is firebase');
		console.log('Using GOOGLE_APPLICATION_CREDENTIALS and FIREBASE_STORAGE_BUCKET');

		initializeApp({
			credential: applicationDefault(),
			storageBucket: process.env.FIREBASE_STORAGE_BUCKET
		});
	}
}

await run();

export { client };