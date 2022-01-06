import { CommandInteraction, Message, TextBasedChannel, TextChannel } from 'discord.js';
import { Discord, Permission, Slash, SlashOption } from 'discordx';
import path from 'path';
import { Blacklist } from '../objects/Blacklist.js';
import * as fs from "fs";



@Permission(false)
@Permission({ id: '923344421003591740', type: 'ROLE', permission: true }) // me on my server
@Permission({ id: '857298384444457030', type: 'ROLE', permission: true }) //MA
@Permission({ id: '857317419731386398', type: 'ROLE', permission: true }) //ancient
@Permission({ id: '857319816770748426', type: 'ROLE', permission: true }) //elder
@Permission({ id: '857321627879997471', type: 'ROLE', permission: true }) //vet
@Permission({ id: '857380232285257749', type: 'ROLE', permission: true }) //mod jr
@Discord()
abstract class BlacklistButler {
    @Slash("add", { description: 'Adds the users to the blacklist' })
    async add(
        @SlashOption('name', { description: 'name of person', required: false })
        name: string,
        @SlashOption('old', { description: 'delete all messages and resend the blacklist to chat', required: false }) // depricate this
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


        const blPrefix = getGuildBlPrefix(interaction);
        const blacklist = new Blacklist(interaction.channel, blPrefix);
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
            await blacklist.updateAllMessages();
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
        
        const blPrefix = getGuildBlPrefix(interaction);
        const blacklist = new Blacklist(interaction.channel, blPrefix);
        blacklist.loadFromFile();
        blacklist.removeOne(name);

        await interaction.reply({ content: 'name has been removed', ephemeral: true });
    }

    @Slash("init", { description: 'Adds the users to the blacklist' })
    async init(
        @SlashOption('adds', { description: 'delete all other messages before printing the list', required: false })
        hasOldAdds: boolean = false,
        interaction: CommandInteraction): Promise<void> {
        if (!interaction.channel || !await isBlacklistChannel(interaction)) return;
        
        const blPrefix = getGuildBlPrefix(interaction);
        const blacklist = new Blacklist(interaction.channel, blPrefix);

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

        const blPrefix = getGuildBlPrefix(interaction);
        
        const blacklist = new Blacklist(interaction.channel, blPrefix);
        try {
            await blacklist.loadFromFile();
            console.log("read from file");
        } catch (error) {
            console.log('fuck this');
            await interaction.reply({ content: 'something went wrong getting the blacklist', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });


        if (clean) await deleteOld(interaction.channel, blPrefix);

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
        messages.forEach(msg => {
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
        messages.forEach(async msg => {
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
function getGuildConfig(interaction: CommandInteraction) {
    try {
        const configMap = fs.readFileSync(path.resolve(process.cwd(),  './guilds/' + interaction.guildId + '/config.json'), 'utf-8');
        console.log(interaction.guildId);
        
        // parse JSON object
        const map = new Map<string, string>(JSON.parse(configMap)); // not posible if the file is empty

        console.log('The parsed guild config map object: ' + map);


        return map;
    } catch (error) {
        console.log(error);
    }
}

function getGuildBlPrefix(interaction: CommandInteraction) {
    const config = getGuildConfig(interaction);
    const blPrefix = config?.get('blPrefix') ?? '**--';
    console.log(blPrefix);
    return blPrefix;
}

