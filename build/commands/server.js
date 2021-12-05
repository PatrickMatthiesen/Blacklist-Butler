import { __decorate, __metadata } from "tslib";
import { CommandInteraction } from 'discord.js';
import { Discord, Slash } from 'discordx';
let AppDiscord = class AppDiscord {
    async server(interaction) {
        await interaction.reply(`Server name: ${interaction.guild?.name}\nTotal members: ${interaction.guild?.memberCount}`);
    }
};
__decorate([
    Slash("server", { description: 'Replies with server info!' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CommandInteraction]),
    __metadata("design:returntype", Promise)
], AppDiscord.prototype, "server", null);
AppDiscord = __decorate([
    Discord()
], AppDiscord);
// module.exports = {
// 	data: new SlashCommandBuilder()
// 		.setName('server')
// 		.setDescription('Replies with server info!'),
// 	async execute(interaction) {
// 		await interaction.reply(`Server name: ${interaction.guild.name}\nTotal members: ${interaction.guild.memberCount}`);
// 	},
// };
