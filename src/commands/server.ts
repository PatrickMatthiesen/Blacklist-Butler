import { CommandInteraction } from 'discord.js';
import { Discord, Slash } from 'discordx';

@Discord()
abstract class BlacklistButler {
	@Slash({ name: 'server', description: 'Replies with server info!'} )
	private async server(interaction: CommandInteraction) {
		await interaction.reply({content: `Server name: ${interaction.guild?.name}\nTotal members: ${interaction.guild?.memberCount}`});
	}
}