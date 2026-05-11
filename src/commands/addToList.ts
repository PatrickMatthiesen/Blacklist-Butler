import { ApplicationCommandOptionType, CommandInteraction, Message, TextBasedChannel, TextChannel, PermissionsBitField, MessageFlags } from 'discord.js';
import { Discord, Slash, SlashGroup, SlashOption } from 'discordx';
import { Blacklist, BlacklistWriteError } from '../objects/Blacklist.js';
import { setGuildBlPrefix } from '../objects/GuildDataHandler.js';
import { BlacklistStore } from '../interfaces/blacklist-store.js';
import { createBlacklistStore } from '../stores/store-factory.js';



@Discord()
@SlashGroup({ description: 'Manage Blacklist', name: 'blacklist', defaultMemberPermissions: [PermissionsBitField.Flags.ManageGuild, PermissionsBitField.Flags.Administrator] })
@SlashGroup('blacklist')
abstract class BlacklistButler {
    @Slash({ name: 'add', description: 'Adds the users to the blacklist' })
    async add(
        @SlashOption({ name: 'name', description: 'name of person', required: true, type: ApplicationCommandOptionType.String })
        name: string,
        interaction: CommandInteraction): Promise<void> {
        if (!await deferInteraction(interaction)) return;
        if (!interaction.channel || !await isBlacklistChannel(interaction)) return;

        if (!name) {
            await respond(interaction, 'please add a name');
            return;
        }

        const store = await getStore(interaction.guildId!);
        const blacklist = new Blacklist(interaction.channel, store);
        await blacklist.init();

        if (blacklist.isEmpty()) {
            console.log('blacklist is empty');
            await respond(interaction, 'something went wrong getting the blacklist');
            return;
        }

        try {
            if (!await blacklist.addOne(name)) {
                await respond(interaction, 'something went wrong adding the name');
                return;
            }

            await blacklist.cleanChat();
            await respond(interaction, `added ${name}`);
        } catch (error) {
            await respond(interaction, getBlacklistWriteErrorMessage(error));
        }
    }

    @Slash({ name: 'remove', description: 'Removes a user from the blacklist' })
    async remove(
        @SlashOption({ name: 'name', description: 'name to remove', required: true, type: ApplicationCommandOptionType.String })
        name: string,
        interaction: CommandInteraction): Promise<void> {
        if (!await deferInteraction(interaction)) return;
        if (!interaction.channel || !await isBlacklistChannel(interaction)) return;

        const store = await getStore(interaction.guildId!);
        const blacklist = new Blacklist(interaction.channel, store);
        await blacklist.init();

        try {
            await blacklist.removeOne(name);
            await respond(interaction, 'name has been removed');
        } catch (error) {
            await respond(interaction, getBlacklistWriteErrorMessage(error));
        }
    }

    @Slash({ name: 'init', description: 'Adds the users to the blacklist' })
    async init(
        @SlashOption({ name: 'from-old-list', description: 'use this option if you have an old list to init from', required: false, type: ApplicationCommandOptionType.Boolean })
        fromOldList = false,
        @SlashOption({ name: 'has-old', description: '(require "from-old-list = true") if messages like "add `name`" should be added to the list', required: false, type: ApplicationCommandOptionType.Boolean })
        hasOldAdds = false,
        @SlashOption({ name: 'rewrite-list', description: 'require from-old-list; rewrite the blacklist messages in this channel', required: false, type: ApplicationCommandOptionType.Boolean })
        rewriteList = false,
        interaction: CommandInteraction): Promise<void> {
        if (!await deferInteraction(interaction)) return;
        if (!interaction.channel || !await isBlacklistChannel(interaction)) return;

        const store = await getStore(interaction.guildId!);
        const blacklist = new Blacklist(interaction.channel, store);

        await blacklist.init();

        try {
            if (fromOldList) {
                const importedBlacklist = new Blacklist(interaction.channel, store);
                await importedBlacklist.init();
                importedBlacklist.resetForImport();

                if (hasOldAdds) await addAllMessages(interaction.channel, importedBlacklist);
                else await addOldMessages(interaction.channel, importedBlacklist);

                const hasImportedNames = importedBlacklist.hasStoredNames();
                const hasSavedNames = blacklist.hasStoredNames();
                const activeBlacklist = hasImportedNames ? importedBlacklist : blacklist;

                if (hasImportedNames) {
                    await importedBlacklist.saveBlacklist();
                } else if (!hasSavedNames) {
                    await respond(interaction, 'I could not find an old blacklist in this channel, and there is no saved blacklist to reuse.');
                    return;
                }

                if (rewriteList) {
                    await deleteOld(interaction.channel, activeBlacklist.getPrefix());
                    await activeBlacklist.writeToChat();
                    await activeBlacklist.saveMessages();
                }

                if (hasImportedNames) {
                    await respond(interaction, 'stored your list' + (hasOldAdds ? ' and added extras' : '') + (rewriteList ? ', and rewrote the blacklist messages in this channel' : ' to the database'));
                } else {
                    await respond(interaction, 'No old blacklist messages were found in this channel, so I reused the saved blacklist' + (rewriteList ? ' and rewrote the blacklist messages here' : '') + '.');
                }
                return;
            }

            if (blacklist.hasStoredNames()) {
                await respond(interaction, 'A saved blacklist already exists for this guild, so I reused it and did not overwrite anything.');
                return;
            }

            blacklist.resetForImport();
            await blacklist.saveBlacklist();
            await respond(interaction, 'I inited the list for you, now just print it :)');
        } catch (error) {
            await respond(interaction, getBlacklistWriteErrorMessage(error));
        }


    }


    @Slash({ name: 'print', description: 'Prints the blacklist to the channel' })
    async print(
        @SlashOption({ name: 'clean', description: 'delete all other messages before printing the list', required: false, type: ApplicationCommandOptionType.String })
        clean = false,
        interaction: CommandInteraction): Promise<void> {
        if (!await deferInteraction(interaction)) return;
        if (!interaction.channel || !await isBlacklistChannel(interaction)) return;

        const store = await getStore(interaction.guildId!);
        const blacklist = new Blacklist(interaction.channel, store);
        try {
            await blacklist.init();
            console.log("read from store");
        } catch (error) {
            console.log('fuck this', error);
            await respond(interaction, 'something went wrong getting the blacklist');
            return;
        }

        // make an empty blacklist
        if (blacklist.isEmpty()) blacklist.initEmpty();

        try {
            if (clean) await deleteOld(interaction.channel, blacklist.getPrefix());

            await blacklist.writeToChat();
            await blacklist.saveMessages();
            await respond(interaction, 'printet list');
        } catch (error) {
            await respond(interaction, getBlacklistWriteErrorMessage(error));
        }
    }

    //if you really dont have a life, then make it so it removes all the category headers and add on the new ones
    //either just use the funktion that have been made (simpe but might be a litte performance heavy?),
    // or make a better one for this usecase (which might be a bad idea as it is a waste of time and code space)
    @Slash({ name: 'set-prefix', description: 'set the prefix that formats the headers in the blacklist' })
    async setPrefix(
        @SlashOption({ name: 'prefix', description: 'a prefix like "--" for a header "--A--" or "***" for a bold and italics header', type: ApplicationCommandOptionType.String })
        prefix: string,
        interaction: CommandInteraction): Promise<void> {
        if (!await deferInteraction(interaction)) return;
        if (!interaction.guildId) return;

        const store = await getStore(interaction.guildId!);

        if (await setGuildBlPrefix(interaction.guildId, prefix, store))
            await respond(interaction, 'The headers will now look like ' + prefix + 'A' + prefix.split('').reverse().join(''));
        else await respond(interaction, 'something went wrong setting the prefix');
    }
}

async function isBlacklistChannel(interaction: CommandInteraction) {
    if ((interaction.channel as TextChannel).name == 'blacklist') {
        return true;
    }

    console.log('channel was not a blacklist');
    await respond(interaction, 'channel is not a blacklist');
    return false;
}

async function deferInteraction(interaction: CommandInteraction) {
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }

        return true;
    } catch (error) {
        console.error('failed to acknowledge interaction', formatDiscordError(error));
        return false;
    }
}

async function respond(interaction: CommandInteraction, content: string) {
    try {
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content });
            return;
        }

        await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('failed to respond to interaction', formatDiscordError(error));
    }
}

async function addAllMessages(channel: TextBasedChannel, blacklist: Blacklist) {
    await fetchAndHandle(channel, blacklist, true, true);
}

async function addOldMessages(channel: TextBasedChannel, blacklist: Blacklist) {
    await fetchAndHandle(channel, blacklist, false, true);
}

async function fetchAndHandle(channel: TextBasedChannel, blacklist: Blacklist, singles = false, old = false) {
    await channel.messages.fetch().then(messages => {
        console.log(`Received ${messages.size} messages`);
        //Iterate through the messages here with the variable "messages".
        messages.forEach((msg: Message<boolean>) => {
            if (old) { //old
                addOld(msg, blacklist);
            }
            if (singles) {
                addSingles(msg, blacklist);
            }
            console.log(msg.content);
        });
    });
}

async function deleteOld(channel: TextBasedChannel, blPrefix: string) {
    await channel.messages.fetch().then(messages => {
        console.log(`Received ${messages.size} messages`);
        //Iterate through the messages here with the variable "messages".
        messages.forEach(async (msg: Message<boolean>) => {
            if (msg.content.startsWith(blPrefix)) {
                await msg.delete();
            }
            console.log(msg.content);
        });
    });
}

async function addOld(msg: Message, blacklist: Blacklist) {
    if (msg.content.startsWith(blacklist.getPrefix())) {
        blacklist.addOld(msg);
    }
}

async function addSingles(msg: Message, blacklist: Blacklist) {
    if (msg.content.toLowerCase().startsWith('add ')) {
        blacklist.addToDelete(msg);
        if (msg.content.includes('\n')) {
            const lines = msg.content.split('\n');
            lines.forEach(line => {
                blacklist.add(line.slice(4));
            });
            return;
        }

        blacklist.add(msg.content.slice(4));
    }
}

async function getStore(guildId: string): Promise<BlacklistStore> {
    return createBlacklistStore(guildId);
}

function getBlacklistWriteErrorMessage(error: unknown) {
    if (error instanceof BlacklistWriteError) {
        if (error.reason == 'cannot-write') {
            return 'I cannot write to the blacklist in this channel. Check that the bot can view this channel, send messages, manage messages when needed, and edit its own messages.';
        }
        
        console.error('unexpected blacklist write error', error);
        return 'I could not update the saved blacklist messages for this channel. If you want to rebuild the list here, run /blacklist init with from-old-list enabled and rewrite-list enabled.';
    }

    console.error('unexpected blacklist error', error);
    return 'something went wrong updating the blacklist';
}

function formatDiscordError(error: unknown) {
    if (typeof error === 'object' && error !== null) {
        const code = 'code' in error ? ` code=${String(error.code)}` : '';
        const status = 'status' in error ? ` status=${String(error.status)}` : '';

        if (error instanceof Error) {
            return `${error.message}${code}${status}`;
        }

        return `${String(error)}${code}${status}`;
    }

    return String(error);
}
