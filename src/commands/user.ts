import { CommandInteraction } from 'discord.js';
import { Discord, Slash } from 'discordx';

@Discord()
abstract class BlacklistButler {
	@Slash({ name: 'user', description: 'Replies with user info!' })
	private async user(interaction: CommandInteraction) {
		await interaction.reply(`Your tag: ${interaction.user.tag}\nYour id: ${interaction.user.id}`);
	}
}