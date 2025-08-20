// Require the necessary discord.js classes
import "reflect-metadata";
import { Interaction, Message, IntentsBitField } from "discord.js";
import { Client } from "discordx";
import { importx } from "@discordx/importer";
import { applicationDefault, cert, initializeApp } from "firebase-admin/app";

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

function initFirebaseIfNeeded() {
	if (process.env.STORE_TYPE !== 'firebase') return;

	const bucket = process.env.FIREBASE_STORAGE_BUCKET;
	if (!bucket) {
		console.error('STORE_TYPE=firebase but FIREBASE_STORAGE_BUCKET missing');
		process.exit(1);
	}

	// Option 1: base64 env var (preferred for local dev to avoid mounting files)
	const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
	if (b64) {
		try {
			const json = JSON.parse(atob(b64));
			initializeApp({ credential: cert(json), storageBucket: bucket });
			console.log('Firebase initialized via FIREBASE_SERVICE_ACCOUNT_BASE64');
			return;
		} catch (e) {
			console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64:', e);
			process.exit(1);
		}
	}

	// Option 2: GOOGLE_APPLICATION_CREDENTIALS path (mounted file)
	if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
		initializeApp({ credential: applicationDefault(), storageBucket: bucket });
		console.log('Firebase initialized via GOOGLE_APPLICATION_CREDENTIALS');
		return;
	}

	console.error('STORE_TYPE=firebase but no credentials provided (set FIREBASE_SERVICE_ACCOUNT_BASE64 or mount GOOGLE_APPLICATION_CREDENTIALS)');
	process.exit(1);
}

async function run() {
	initFirebaseIfNeeded();
	await importx(import.meta.dirname + "/{events,commands}/**/*.{ts,js}");
	await client.login(token); // provide your bot token
}

await run();

export { client };