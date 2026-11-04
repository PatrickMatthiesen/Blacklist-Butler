import { CommandInteraction, MessageFlags } from 'discord.js';

export async function ping(interaction: CommandInteraction) {
	await interaction.reply({ content: 'Pong!', flags: MessageFlags.Ephemeral });
}
