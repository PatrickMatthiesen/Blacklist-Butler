import { __decorate, __metadata } from "tslib";
import { CommandInteraction } from 'discord.js';
import { Discord, Slash } from 'discordx';
let AppDiscord = class AppDiscord {
    async ping(interaction) {
        await interaction.reply('Pong!');
    }
};
__decorate([
    Slash("ping", { description: 'Replies with Pong!' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CommandInteraction]),
    __metadata("design:returntype", Promise)
], AppDiscord.prototype, "ping", null);
AppDiscord = __decorate([
    Discord()
], AppDiscord);
// module.exports = {
// 	data: new SlashCommandBuilder()
// 		.setName('ping')
// 		.setDescription('Replies with Pong!'),
// 	async execute(interaction) {
// 		await interaction.reply('Pong!');
// 	},
// };
