import { CommandInteraction } from 'discord.js';
import { Discord, Slash } from 'discordx';

@Discord()
abstract class AppDiscord {
	@Slash("user", {description: 'Replies with user info!'} )
	private async user(interaction: CommandInteraction) {
		await interaction.reply(`Your tag: ${interaction.user.tag}\nYour id: ${interaction.user.id}`);
	}
}

// module.exports = {
// 	data: new SlashCommandBuilder()
// 		.setName('user')
// 		.setDescription('Replies with user info!'),
// 	async execute(interaction) {
// 		await interaction.reply(`Your tag: ${interaction.user.tag}\nYour id: ${interaction.user.id}`);
// 	},
// };