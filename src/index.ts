// Require the necessary discord.js classes
// const { Client, Collection, Intents } = require('discord.js');
import { Intents, Interaction, Message } from "discord.js";
import { Client } from "discordx";
import { dirname, importx } from "@discordx/importer";
import * as dotenv from "dotenv"

// get secrets
dotenv.config();
const token = process.env.DISCORD_TOKEN;
//const clientId = process.env.CLIENT_ID;
// const guildId = process.env.GUILD_ID;

// Create a new client instance
const client = new Client({
	simpleCommand: {
		prefix: "!"
	},
	classes: [`${dirname(import.meta.url)}/commands/**/*.{js,ts}`],
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MESSAGES
	],
	silent: false //console logs: on/off
});

// client.commands = new Collection();
// const commandFiles = fs.readdirSync('./commands').filter((file: string) => file.endsWith('.js'));

// for (const file of commandFiles) {
// 	const command = require(`./commands/${file}`);
// 	// Set a new item in the Collection
// 	// With the key as the command name and the value as the exported module
// 	client.commands.set(command.data.name, command);
// }

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

// client.on('interactionCreate', async interaction => {
// 	if (!interaction.isCommand()) return;

// 	const command = client.commands.get(interaction.commandName);

// 	if (!command) return;

// 	try {
// 		await command.execute(interaction, interaction.channel);
// 	} catch (error) {
// 		console.error(error);
// 		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
// 	}
// });

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
	client.login(token ?? ""); // provide your bot token
}

run();