import { CommandInteraction, Message, TextBasedChannels, TextChannel } from 'discord.js';
import { Discord, Permission, Slash, SlashOption } from 'discordx';
import { Blacklist } from '../objects/Blacklist.js';



@Permission(false)
@Permission({ id: '923344421003591740', type: 'ROLE', permission: true })
@Discord()
abstract class BlacklistButler {
    @Slash("add", { description: 'Adds the users to the blacklist' })
    async add(
        @SlashOption('name', { description: 'name of person' })
        name: string,
        @SlashOption('old', { description: 'delete all messages and resend the blacklist to chat' }) // depricate this
        hasOldMessages: boolean = false,
        // @SlashChoice('One', 'one')
        // @SlashOption('amount', { description: 'add all or just one' })
        // amount: string,
        interaction: CommandInteraction): Promise<void> {
        if (!interaction.channel || !await isBlacklistChannel(interaction)) return;

        if (!name && !hasOldMessages) {
            await interaction.reply({ content: 'please add a name or ask me to add old messages starting with "add "', ephemeral: true });
            return;
        }

        const blacklist = new Blacklist(hasOldMessages, interaction.channel);
        blacklist.loadFromFile();

        if (blacklist.isEmpty()) {
            console.log('blacklist is empty');
            await interaction.reply({ content: 'something went wrong getting the blacklist', ephemeral: true });
            return;
        }

        if (hasOldMessages) {
            await addNewMessages(interaction.channel, blacklist);
            console.log("read from file and added new");
        }

        if (name && !hasOldMessages) {
            if (!await blacklist.addOne(name)) {
                await interaction.reply({ content: 'something went wrong adding the name', ephemeral: true });
                return;
            }
        } else blacklist.add(name);

        if (hasOldMessages) {
            blacklist.updateAllMessages();
        }

        await blacklist.cleanChat();

        await interaction.reply({ content: `${name ? 'added ' + name : ''}${hasOldMessages ? ' and added extra from chat' : ''}`, ephemeral: true });
        blacklist.saveBlacklistToFile();
    }

    @Slash("remove", { description: 'Adds the users to the blacklist' })
    async remove(
        @SlashOption('name', { description: 'name to remove' })
        name: string,
        interaction: CommandInteraction): Promise<void> {
        if (!interaction.channel || !await isBlacklistChannel(interaction)) return;
        
        const blacklist = new Blacklist(false, interaction.channel);
        blacklist.loadFromFile();
        blacklist.removeOne(name);

        await interaction.reply({ content: 'name has been removed', ephemeral: true });
    }

    @Slash("init", { description: 'Adds the users to the blacklist' })
    async init(
        @SlashOption('adds', { description: 'delete all other messages before printing the list' })
        hasOldAdds: boolean = false,
        interaction: CommandInteraction): Promise<void> {
        if (!interaction.channel || !await isBlacklistChannel(interaction)) return;
        
        const blacklist = new Blacklist(hasOldAdds, interaction.channel);
        if (hasOldAdds) await addAllMessages(interaction.channel, blacklist);
        else await addOldMessages(interaction.channel, blacklist);

        blacklist.saveBlacklistToFile();

        await interaction.reply({ content: 'stored your list' + (hasOldAdds ? ' and added extras' : '') + ' to the database', ephemeral: true });
    }


    @Slash("print", { description: 'Prints the blacklist to the channel' })
    async print(
        @SlashOption('clean', { description: 'delete all other messages before printing the list' })
        clean: boolean = false,
        interaction: CommandInteraction): Promise<void> {
        if (!interaction.channel || !await isBlacklistChannel(interaction)) return;

        const blacklist = new Blacklist(true, interaction.channel);
        try {
            await blacklist.loadFromFile();
            console.log("read from file");
        } catch (error) {
            console.log('fuck this');
            await interaction.reply({ content: 'something went wrong getting the blacklist', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        if (clean) await deleteOld(interaction.channel);

        await blacklist.writeToChat();

        await interaction.editReply({ content: 'printet list' });



        blacklist.saveMessageIdsToFile();
    }



}

async function isBlacklistChannel(interaction: CommandInteraction) {
    if ((interaction.channel as TextChannel).name !== 'blacklist') {
        console.log('channel was not a blacklist');
        await interaction.reply({ content: 'channel is not a blacklist', ephemeral: true });
        return false;
    }

    return true;
}

async function addAllMessages(channel: TextBasedChannels, blacklist: Blacklist) {
    await fetchAndHandle(channel, blacklist, true, true);
}

async function addNewMessages(channel: TextBasedChannels, blacklist: Blacklist) {
    await fetchAndHandle(channel, blacklist, true);
}

async function addOldMessages(channel: TextBasedChannels, blacklist: Blacklist) {
    await fetchAndHandle(channel, blacklist, false, true);
}

async function fetchAndHandle(channel: TextBasedChannels, blacklist: Blacklist, singles = false, old = false) {
    await channel.messages.fetch().then(messages => {
        console.log(`Received ${messages.size} messages`);
        //Iterate through the messages here with the variable "messages".
        messages.forEach(msg => {
            if (old) {
                addOld(msg, blacklist);
            }
            if (singles) {
                addSingles(msg, blacklist);
            }
            console.log(msg.content);
        });
    });
}

async function deleteOld(channel: TextBasedChannels) {
    await channel.messages.fetch().then(messages => {
        console.log(`Received ${messages.size} messages`);
        //Iterate through the messages here with the variable "messages".
        messages.forEach(async msg => {
            if (msg.content.startsWith('**--')) {
                await msg.delete();
            }
            console.log(msg.content);
        });
    });
}

function addOld(msg: Message, blacklist: Blacklist) {
    if (msg.content.startsWith('--')) {
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
