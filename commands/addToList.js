const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add')
		.setDescription('Adds the user to the blacklist'),
	async execute(interaction) {
		await interaction.reply(`FIXME`); //FIXME
	},
};