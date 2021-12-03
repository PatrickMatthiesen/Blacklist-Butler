// Require the necessary discord.js classes
const { Client, Collection, Intents } = require('discord.js');
const fs = require('fs');

// get secrets
require('dotenv').config();
const token = process.env.DISCORD_TOKEN;
//const clientId = process.env.CLIENT_ID;
// const guildId = process.env.GUILD_ID;

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]});

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	// Set a new item in the Collection
	// With the key as the command name and the value as the exported module
	client.commands.set(command.data.name, command);
}

// When the client is ready, run this code (only once)
client.once('ready', () => {
    //const Guilds = client.guilds.cache.map(guild => guild.id); // get the ids of all atached guilds

	console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;
	
    const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction, interaction.channel);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

client.on('messageCreate', async (message) => {
    if (!message || message.author.bot) return;
    
    // const command = client.commands.get(message.commandName);

	// if (!command) return;

	// try {
	// 	await command.execute(message);
	// } catch (error) {
	// 	console.error(error);
	// 	await message.reply('There was an error while executing this command!');
	// }

    message.channel.send(message.content);
});

// Login to Discord with your client's token
client.login(token);