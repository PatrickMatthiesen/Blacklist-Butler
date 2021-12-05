import { CommandInteraction } from 'discord.js';
import { Discord, Slash } from 'discordx';

@Discord()
abstract class AppDiscord {
	@Slash("ping", {description: 'Replies with Pong!'} )
	private async ping(interaction: CommandInteraction) {
		await interaction.reply('Pong!');
	}
}

// module.exports = {
// 	data: new SlashCommandBuilder()
// 		.setName('ping')
// 		.setDescription('Replies with Pong!'),
// 	async execute(interaction) {
// 		await interaction.reply('Pong!');
// 	},
// };