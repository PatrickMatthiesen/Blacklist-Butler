import { CommandInteraction } from 'discord.js';
import { Discord, Slash } from 'discordx';

@Discord()
abstract class BlacklistButler {
	@Slash({ name: 'ping', description: 'Replies with Pong!' })
	private async ping(interaction: CommandInteraction) {
		await interaction.reply({ content: 'Pong!', flags: MessageFlags.Ephemeral });
	}
}