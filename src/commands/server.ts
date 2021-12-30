import { EPERM } from 'constants';
import { CommandInteraction } from 'discord.js';
import { Discord, Permission, Slash } from 'discordx';

@Permission(false)
@Permission({ id: '923344421003591740', type: 'ROLE', permission: true })
@Discord()
abstract class BlacklistButler {
	@Slash("server", {description: 'Replies with server info!'} )
	private async server(interaction: CommandInteraction) {
		await interaction.reply({content: `Server name: ${interaction.guild?.name}\nTotal members: ${interaction.guild?.memberCount}`, ephemeral: true});
	}
}

// module.exports = {
// 	data: new SlashCommandBuilder()
// 		.setName('server')
// 		.setDescription('Replies with server info!'),
// 	async execute(interaction) {
// 		await interaction.reply(`Server name: ${interaction.guild.name}\nTotal members: ${interaction.guild.memberCount}`);
// 	},
// };