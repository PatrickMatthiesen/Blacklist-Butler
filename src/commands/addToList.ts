import { Channel, CommandInteraction, Message, TextBasedChannels, TextChannel } from 'discord.js';
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
        @SlashOption('refresh', { description: 'delere all messages and resend the blacklist to chat' })
        refresh: boolean = false,
        // @SlashChoice('One', 'one')
        // @SlashOption('amount', { description: 'add all or just one' })
        // amount: string,
        interaction: CommandInteraction): Promise<void> {
        if (!interaction.channel) {
            return;
        }

        if ((interaction.channel as TextChannel).name !== 'blacklist') {
            console.log('channel was not a blacklist');
            await interaction.reply({ content: 'channel is not a blacklist', ephemeral: true });
            return;
        }

        var blacklist = new Blacklist(refresh, interaction.channel);
        if (!refresh) {
            try {
                await blacklist.loadFromFile() // would be a good idea to save the id's of the old messages too, so it is posible to find them again in case that something has to be edited
                await addNew(interaction.channel, blacklist)
                //load add methods
            } catch (error) {
                console.log('fuck this');
                await addAll(interaction.channel, blacklist) // if the try works then some kind of way to fetch some of the messages and add them to the map if they start with 'add ...'
            }
        }

        if (blacklist.isEmpty() && refresh) {
            await addAll(interaction.channel, blacklist)
        }

        refresh = blacklist.getRefresh()

        if (name) {
            blacklist.add(name)
        }

        if (!name || name == 'all') {
            //do some delete stuff for the messages of style 'add someName'
            // await interaction.reply({ content: 'added all to the list' + (refresh ? 'and refreshed the list' : ''), ephemeral: true })
        }
        
        if (refresh) {
            console.log('tries to write to channel');
            await blacklist.cleanChat()
            await blacklist.writeToChat()
        } else blacklist.updateOldMessages()
        
        
        await interaction.reply({ content: `added ${name}! ${refresh}`, ephemeral: true });
        blacklist.saveToFile()
    }
}

async function addAll(channel: TextBasedChannels, blacklist: Blacklist) {
    await fetchAndHandle(channel, blacklist, true, true)
}

async function addNew(channel: TextBasedChannels, blacklist: Blacklist) {
    await fetchAndHandle(channel, blacklist, true)
}

async function fetchAndHandle(channel: TextBasedChannels, blacklist: Blacklist, singles: boolean = false, old: boolean = false) {
    await channel.messages.fetch().then(messages => {
        console.log(`Received ${messages.size} messages`);
        //Iterate through the messages here with the variable "messages".
        messages.forEach(msg => {
            if (old) {
                addOld(msg, blacklist)
            }
            if (singles) {
                addSingles(msg, blacklist)
            }
            console.log(msg.content);
        });
    });
}

function addOld(msg: Message, blacklist: Blacklist) {
    if (msg.content.startsWith('--')) {
        blacklist.addOld(msg)
    }
}

async function addSingles(msg: Message, blacklist: Blacklist) {
    if (msg.content.toLowerCase().startsWith('add ')) {
        blacklist.add(msg.content.slice(4))
        // addToBl(msg.content.slice(4));
        // chatListIds.push(msg.id);
    }
}

