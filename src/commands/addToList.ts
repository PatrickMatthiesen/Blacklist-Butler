import { ApplicationCommandOptionType, CommandInteraction, Message, TextBasedChannel, TextChannel, PermissionsBitField } from 'discord.js';
import { Discord, Slash, SlashGroup, SlashOption } from 'discordx';
import { Blacklist } from '../objects/Blacklist.js';
import { setGuildBlPrefix } from '../objects/GuildDataHandler.js';
import { LocalBlacklistStore } from '../objects/local-blacklist-store.js';
import { FirebaseBlacklistStore } from '../Firebase/firebase-blacklist-store.js';
import { BlacklistStore } from '../interfaces/blacklist-store.js';



@Discord()
@SlashGroup({ description: 'Manage Blacklist', name: 'blacklist', defaultMemberPermissions: [PermissionsBitField.Flags.ManageGuild, PermissionsBitField.Flags.Administrator] })
@SlashGroup('blacklist')
abstract class BlacklistButler {
    @Slash({ name: 'add', description: 'Adds the users to the blacklist' })
    async add(
        @SlashOption({ name: 'name', description: 'name of person', required: false, type: ApplicationCommandOptionType.String })
        name: string,
        @SlashOption({ name: 'old', description: 'delete all messages and resend the blacklist to chat', required: false, type: ApplicationCommandOptionType.Boolean }) // depricate this
        hasOldMessages = false,
        // @SlashChoice('One', 'one')
        // @SlashOption('amount', { description: 'add all or just one' })
        // amount: string,
        interaction: CommandInteraction): Promise<void> {
        if (!interaction.channel || !await isBlacklistChannel(interaction)) return;

        if (!name && !hasOldMessages) {
            await interaction.reply({ content: 'please add a name or ask me to add old messages starting with "add "', ephemeral: true });
            return;
        }
        await interaction.deferReply({ ephemeral: true });

        const store = await getStore(interaction.guildId!);
        const blacklist = new Blacklist(interaction.channel, store);
        await blacklist.init();

        if (blacklist.isEmpty()) {
            console.log('blacklist is empty');
            await interaction.editReply({ content: 'something went wrong getting the blacklist' });
            return;
        }

        if (hasOldMessages) {
            await addNewMessages(interaction.channel, blacklist);
            console.log("read from file and added new");
        }

        if (name && !hasOldMessages) {
            if (!await blacklist.addOne(name)) {
                await interaction.editReply({ content: 'something went wrong adding the name' });
                return;
            }
        } else blacklist.add(name);

        if (hasOldMessages) {
            await blacklist.updateAllMessages();
        }

        await blacklist.cleanChat();

        await interaction.editReply({ content: `${name ? 'added ' + name : ''}${hasOldMessages ? ' and added extra from chat' : ''}` });
        blacklist.saveBlacklist();
    }

    @Slash({ name: 'remove', description: 'Removes a user from the blacklist' })
    async remove(
        @SlashOption({ name: 'name', description: 'name to remove', type: ApplicationCommandOptionType.String })
        name: string,
        interaction: CommandInteraction): Promise<void> {
        if (!interaction.channel || !await isBlacklistChannel(interaction)) return;

        await interaction.deferReply({ ephemeral: true });

        const store = await getStore(interaction.guildId!);
        const blacklist = new Blacklist(interaction.channel, store);
        await blacklist.init();

        await blacklist.removeOne(name);

        await interaction.editReply({ content: 'name has been removed' });
    }

    @Slash({ name: 'init', description: 'Adds the users to the blacklist' })
    async init(
        @SlashOption({ name: 'from-old-list', description: 'use this option if you have an old list to init from', required: false, type: ApplicationCommandOptionType.String })
        fromOldList = false,
        @SlashOption({ name: 'has-old', description: '(require "from-old-list = true") if messages like "add `name`" should be added to the list', required: false, type: ApplicationCommandOptionType.String })
        hasOldAdds = false,
        interaction: CommandInteraction): Promise<void> {
        if (!interaction.channel || !await isBlacklistChannel(interaction)) return;

        await interaction.deferReply({ ephemeral: true });

        const store = await getStore(interaction.guildId!);
        const blacklist = new Blacklist(interaction.channel, store);

        if (fromOldList) {
            if (hasOldAdds) await addAllMessages(interaction.channel, blacklist);
            else await addOldMessages(interaction.channel, blacklist);
            await interaction.editReply({ content: 'stored your list' + (hasOldAdds ? ' and added extras' : '') + ' to the database' });

        } else {
            blacklist.initEmpty();
            await interaction.editReply({ content: 'I inited the list for you, now just print it :)' });
        }

        blacklist.saveBlacklist();

    }


    @Slash({ name: 'print', description: 'Prints the blacklist to the channel' })
    async print(
        @SlashOption({ name: 'clean', description: 'delete all other messages before printing the list', required: false, type: ApplicationCommandOptionType.String })
        clean = false,
        interaction: CommandInteraction): Promise<void> {
        if (!interaction.channel || !await isBlacklistChannel(interaction)) return;

        await interaction.deferReply({ ephemeral: true });

        const store = await getStore(interaction.guildId!);
        const blacklist = new Blacklist(interaction.channel, store);
        try {
            blacklist.init();
            console.log("read from store");
        } catch (error) {
            console.log('fuck this', error);
            await interaction.editReply({ content: 'something went wrong getting the blacklist' });
            return;
        }

        // make an empty blacklist
        if (blacklist.isEmpty()) blacklist.initEmpty();

        if (clean) await deleteOld(interaction.channel, blacklist.getPrefix());

        await blacklist.writeToChat();

        await interaction.editReply({ content: 'printet list' });

        blacklist.saveMessages();
    }

    //if you really dont have a life, then make it so it removes all the category headers and add on the new ones
    //either just use the funktion that have been made (simpe but might be a litte performance heavy?),
    // or make a better one for this usecase (which might be a bad idea as it is a waste of time and code space)
    @Slash({ name: 'set-prefix', description: 'set the prefix that formats the headers in the blacklist' })
    async setPrefix(
        @SlashOption({ name: 'prefix', description: 'a prefix like "--" for a header "--A--" or "***" for a bold and italics header', type: ApplicationCommandOptionType.String })
        prefix: string,
        interaction: CommandInteraction): Promise<void> {
        if (!interaction.guildId) return;

        await interaction.deferReply({ ephemeral: true });

        const store = await getStore(interaction.guildId!);

        if (await setGuildBlPrefix(interaction.guildId, prefix, store))
            await interaction.editReply({ content: 'The headers will now look like ' + prefix + 'A' + prefix.split('').reverse().join('') });
        else await interaction.editReply({ content: 'something went wrong setting the prefix' });
    }
}

async function isBlacklistChannel(interaction: CommandInteraction) {
    if ((interaction.channel as TextChannel).name == 'blacklist') {
        return true;
    }
    
    console.log('channel was not a blacklist');
    await interaction.reply({ content: 'channel is not a blacklist', ephemeral: true });
    return false;
}

async function addAllMessages(channel: TextBasedChannel, blacklist: Blacklist) {
    await fetchAndHandle(channel, blacklist, true, true);
}

async function addNewMessages(channel: TextBasedChannel, blacklist: Blacklist) {
    await fetchAndHandle(channel, blacklist, true);
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
    if (process.env.STORE_TYPE == 'firebase' || process.env.GOOGLE_APPLICATION_CREDENTIALS)
        return new FirebaseBlacklistStore(guildId);

    return new LocalBlacklistStore(guildId);
}