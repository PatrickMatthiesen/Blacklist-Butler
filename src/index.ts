import { ApplicationCommandPermissions } from 'discord.js';
// Require the necessary discord.js classes
// const { Client, Collection, Intents } = require('discord.js');
import "reflect-metadata";
import { Interaction, Message, IntentsBitField  } from "discord.js";
import { Client } from "discordx";
import { dirname, importx } from "@discordx/importer";
import * as dotenv from "dotenv";


// get secrets
dotenv.config();
const token = process.env.DISCORD_TOKEN ?? '';

// Create a new client instance
const client = new Client({
	simpleCommand: {
		prefix: "!"
	},
	intents: [
		IntentsBitField.Flags.Guilds,
		IntentsBitField.Flags.GuildMembers,
		IntentsBitField.Flags.GuildMessages,
	],
	botGuilds: [client => client.guilds.cache.map(g => g.id)], //new guilds wont have permissions nor will they have any commands as the bot will need a restart in its current state
	silent: false //console logs: on/off
});



// When the client is ready, run this code (only once)
client.once('ready', async () => {
	// to create/update/delete discord application commands
	await client.initApplicationCommands({
		global: { log: true },
		guild: { log: true }
	});
	// client.initApplicationPermissions(true);

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
	await client.login(token); // provide your bot token
}

run();

export { client };