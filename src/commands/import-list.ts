import {
    ActionRowBuilder, ButtonBuilder, ButtonStyle, type ChatInputCommandInteraction,
    ComponentType, escapeMarkdown, MessageFlags,
} from 'discord.js';
import { createBlacklistStore } from '../stores/store-factory.js';
import { readImportRange, type ImportPreview } from './import-list-data.js';

const interactionTimeout = 120_000;

export async function importList(interaction: ChatInputCommandInteraction) {
    const channel = interaction.channel;
    if (!interaction.inGuild() || !channel?.isTextBased() || !('name' in channel) || channel.name !== 'blacklist') {
        await interaction.reply({ content: 'Run this command in your blacklist channel.', flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const firstId = interaction.options.getString('first-id', true).trim();
    const lastId = interaction.options.getString('last-id', true).trim();
    try {
        const preview = await readImportRange(channel, firstId, lastId, interaction.client.user.id);
        const store = createBlacklistStore(interaction.guildId);
        const saved = await store.load();
        let replacementNotice = '';
        if (saved.blacklist.size || saved.messages.size) {
            const channelIds = new Set([...saved.messages.values()].map(message => message.channelId));
            const [savedChannelId] = channelIds;
            replacementNotice = channelIds.size === 1 && savedChannelId && /^\d+$/.test(savedChannelId)
                ? `This will replace the saved blacklist from <#${savedChannelId}>.`
                : 'This will replace the guild\'s saved blacklist.';
        }
        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('confirm-import').setLabel('Import').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('cancel-import').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
        );
        const reply = await interaction.editReply({
            content: [
                `Detected prefix: ${escapeMarkdown(preview.prefix)}`,
                `Found ${preview.sections.size} letter sections and ${preview.entryCount} names in the selected range.`,
                replacementNotice,
                'The existing Discord messages will stay unchanged.',
            ].filter(Boolean).join('\n'),
            components: [buttons],
            allowedMentions: { parse: [] },
        });
        const confirmation = await reply.awaitMessageComponent({
            componentType: ComponentType.Button,
            time: interactionTimeout,
            filter: candidate => candidate.user.id === interaction.user.id
                && ['confirm-import', 'cancel-import'].includes(candidate.customId),
        }).catch(() => null);
        if (!confirmation) {
            await interaction.editReply({ content: 'Import timed out. Nothing was imported.', components: [] });
            return;
        }
        if (confirmation.customId === 'cancel-import') {
            await confirmation.update({ content: 'Import cancelled. Nothing was imported.', components: [] });
            return;
        }

        await confirmation.deferUpdate();
        await interaction.editReply({ content: 'Checking the selected messages before importing...', components: [] });
        const current = await readImportRange(channel, firstId, lastId, interaction.client.user.id);
        if (!sameList(preview, current)) {
            await interaction.editReply({ content: 'The selected list changed after the preview. Nothing was imported. Run /blacklist import again.' });
            return;
        }
        const config = await store.loadConfig();
        config.set('blPrefix', current.prefix);
        try {
            await store.save(current.sections, current.messages);
            await store.saveConfig(config);
        } catch (error) {
            throw new Error('Could not save the import. No Discord messages were changed. Please try again.', { cause: error });
        }
        await interaction.editReply({
            content: `Imported ${current.entryCount} names and saved ${current.messages.size} existing message IDs with prefix ${escapeMarkdown(current.prefix)}. No channel messages were changed.`,
            allowedMentions: { parse: [] },
        });
    } catch (error) {
        await interaction.editReply({
            content: error instanceof Error ? error.message : 'Import failed. Check the selected message IDs and try again.',
            components: [], allowedMentions: { parse: [] },
        });
    }
}

function sameList(left: ImportPreview, right: ImportPreview) {
    return left.prefix === right.prefix && left.messages.size === right.messages.size
        && [...left.messages].every(([letter, message]) => right.messages.get(letter)?.id === message.id
            && JSON.stringify(left.sections.get(letter)) === JSON.stringify(right.sections.get(letter)));
}
