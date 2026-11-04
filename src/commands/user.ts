import { CommandInteraction } from 'discord.js';

export async function user(interaction: CommandInteraction) {
	await interaction.reply(`Your tag: ${interaction.user.tag}\nYour id: ${interaction.user.id}`);
}
