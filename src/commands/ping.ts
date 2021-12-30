import { CommandInteraction } from 'discord.js';
import { Discord, Slash } from 'discordx';

@Discord()
abstract class BlacklistButler {
	@Slash("ping", {description: 'Replies with Pong!'} )
	private async ping(interaction: CommandInteraction) {
		await interaction.reply({ content: 'Pong!', ephemeral: true});
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