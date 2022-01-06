// Require the necessary discord.js classes
// const { Client, Collection, Intents } = require('discord.js');
import { Intents, Interaction, Message } from "discord.js";
import { Client } from "discordx";
import { dirname, importx } from "@discordx/importer";
import * as dotenv from "dotenv";

// get secrets
dotenv.config();
const token = process.env.DISCORD_TOKEN ?? '';
//const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID ?? '';

// Create a new client instance
const client = new Client({
	simpleCommand: {
		prefix: "!"
	},
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MESSAGES
	],
	botGuilds: [guildId, '857279315753959424'], //remmeber this for later as it will have to be the ids of the guilds the bot is in
	silent: false //console logs: on/off
});


// When the client is ready, run this code (only once)
client.once('ready', async () => {
	//const Guilds = client.guilds.cache.map(guild => guild.id); // get the ids of all atached guilds

	// to create/update/delete discord application commands
	await client.initApplicationCommands({
		global: { log: true },
		guild: { log: true }
	});
	await client.initApplicationPermissions(true);

	console.log("Bot started!");
});

client.on("interactionCreate", (interaction: Interaction) => {
	client.executeInteraction(interaction);
});

// has to be decorated with @SimpleCommand()
// https://discord-ts.js.org/docs/decorators/commands/simplecommand/
client.on('messageCreate', async (message: Message) => {

	client.executeCommand(message);

	// if (!message || message.author.bot) return;

	// // const command = client.commands.get(message.commandName);

	// // if (!command) return;

	// // try {
	// // 	await command.execute(message);
	// // } catch (error) {
	// // 	console.error(error);
	// // 	await message.reply('There was an error while executing this command!');
	// // }

	// message.channel.send(message.content);
});

async function run() {
	await importx(dirname(import.meta.url) + "/{events,commands}/**/*.{ts,js}");
	client.login(token); // provide your bot token
}

run();