import { __decorate, __metadata } from "tslib";
import { CommandInteraction } from 'discord.js';
import { Discord, Slash } from 'discordx';
let AppDiscord = class AppDiscord {
    async user(interaction) {
        await interaction.reply(`Your tag: ${interaction.user.tag}\nYour id: ${interaction.user.id}`);
    }
};
__decorate([
    Slash("user", { description: 'Replies with user info!' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CommandInteraction]),
    __metadata("design:returntype", Promise)
], AppDiscord.prototype, "user", null);
AppDiscord = __decorate([
    Discord()
], AppDiscord);
// module.exports = {
// 	data: new SlashCommandBuilder()
// 		.setName('user')
// 		.setDescription('Replies with user info!'),
// 	async execute(interaction) {
// 		await interaction.reply(`Your tag: ${interaction.user.tag}\nYour id: ${interaction.user.id}`);
// 	},
// };
