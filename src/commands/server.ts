import { CommandInteraction } from 'discord.js';

export async function server(interaction: CommandInteraction) {
	await interaction.reply({content: `Server name: ${interaction.guild?.name}\nTotal members: ${interaction.guild?.memberCount}`});
}
