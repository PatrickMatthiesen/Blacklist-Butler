// Require the necessary discord.js classes
import "reflect-metadata";
import { Interaction, Message, IntentsBitField } from "discord.js";
import { Client } from "discordx";
import { dirname, importx } from "@discordx/importer";

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
	await importx(dirname(import.meta.url) + "/{events,commands}/**/*.{ts,js}");
	await client.login(token); // provide your bot token
}

await run();

export { client };