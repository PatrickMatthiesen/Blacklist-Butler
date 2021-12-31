import { EPERM } from 'constants';
import { CommandInteraction } from 'discord.js';
import { Discord, Permission, Slash } from 'discordx';

@Permission(false)
@Permission({ id: '923344421003591740', type: 'ROLE', permission: true })
@Permission({ id: '857298384444457030', type: 'ROLE', permission: true }) //MA
@Permission({ id: '857317419731386398', type: 'ROLE', permission: true }) //ancient
@Permission({ id: '857319816770748426', type: 'ROLE', permission: true }) //elder
@Permission({ id: '857321627879997471', type: 'ROLE', permission: true }) //vet
@Permission({ id: '857380232285257749', type: 'ROLE', permission: true }) //mod jr
@Discord()
abstract class BlacklistButler {
	@Slash("server", {description: 'Replies with server info!'} )
	private async server(interaction: CommandInteraction) {
		await interaction.reply({content: `Server name: ${interaction.guild?.name}\nTotal members: ${interaction.guild?.memberCount}`});
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