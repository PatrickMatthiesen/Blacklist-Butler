import { Channel, CommandInteraction, DiscordAPIError, Message, TextBasedChannels, TextChannel } from 'discord.js';
import { Discord, Permission, Slash, SlashChoice, SlashOption } from 'discordx';
import * as fs from "fs"



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
        await addAll(interaction.channel, blacklist)
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
            await blacklist.writeToChat()
        } else blacklist.updateOldMessages()
        

        await interaction.reply({ content: `added ${name}! ${refresh}`, ephemeral: true });
    }
}

// import { Channel, CommandInteraction, Interaction, TextChannel } from "discord.js";

//change this to the old text if it exists, and modify it, save the id of the messages for deletion later after the reply has been made
// const message = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis in dignissim justo. Aliquam vel dictum lectus. Phasellus dictum elit vitae justo pharetra rhoncus. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Quisque et ligula lacinia, porttitor nulla a, euismod nunc. Etiam tellus sapien, porta nec massa non, finibus mattis leo. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Aliquam massa arcu, ullamcorper id felis at, dapibus vulputate enim.' +
// 'Nulla eu dapibus arcu, nec molestie sapien. Maecenas sodales vitae est eget dictum. Praesent eget erat ipsum. Nunc vestibulum finibus eleifend. Cras turpis nibh, imperdiet non sollicitudin et, auctor nec nisl. Ut convallis quis nulla ut tristique. Proin commodo odio luctus ipsum vestibulum placerat. Vestibulum ac mollis turpis. Vivamus laoreet egestas sem, non tincidunt eros mattis at. Aenean a aliquam felis, a ullamcorper dui. Donec justo metus, gravida in convallis ut, cursus vitae leo. Quisque iaculis pellentesque rutrum. Sed semper eget neque vel feugiat.\n' +
// 'Phasellus non justo blandit, pellentesque odio ut, cursus dui. Vivamus quis volutpat dolor. Quisque sed arcu accumsan, posuere turpis id, ornare dolor. Suspendisse potenti. Nam volutpat neque vitae mi tincidunt, a pellentesque odio faucibus. In porttitor et nisl et condimentum. Sed ligula ante, congue et urna ac, tristique finibus ex. Vestibulum nunc dolor, ultricies quis convallis in, hendrerit varius urna. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.\n' +        
// 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum et sollicitudin felis. Vestibulum pretium metus at pellentesque iaculis. Fusce ornare purus id efficitur eleifend. Mauris volutpat ligula tellus, ac maximus enim tempor vel. Morbi ut porttitor augue, eget congue urna. Curabitur venenatis gravida mauris vel hendrerit. Vivamus a dolor ex. Ut mollis, ipsum semper sollicitudin ultrices, dolor orci efficitur neque, in placerat risus velit et diam. Etiam ornare nunc ut sapien imperdiet, eu venenatis massa laoreet. Duis fermentum turpis ac lectus sagittis aliquam. Quisque ut magna dolor. Donec tristique mi semper dui luctus cursus. Ut quis sollicitudin lacus, scelerisque vulputate eros. Aenean ac nibh volutpat, ultrices tortor vel, fringilla diam. Mauris pharetra, justo id dapibus porttitor, velit arcu consequat nisi, quis sagittis lacus mauris nec eros.\n'+
// 'Curabitur sed diam elementum, egestas est eget, finibus risus. Curabitur eleifend ligula velit, eget fringilla nulla fringilla eu. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Praesent mollis tortor et felis placerat accumsan. Fusce efficitur malesuada sapien, quis vulputate dolor commodo consectetur. Proin ullamcorper semper ipsum, ac tincidunt tortor porttitor quis. Nullam eros ipsum, pellentesque sed quam fringilla, pretium pharetra elit.';

const chatListIds: string[] = [];
const _blacklist = new Map<string, string[]>([
    ['A', []],
    ['B', []],
    ['C', []],
    ['D', []],
    ['E', []],
    ['F', []],
    ['G', []],
    ['H', []],
    ['I', []],
    ['J', []],
    ['K', []],
    ['L', []],
    ['M', []],
    ['N', []],
    ['O', []],
    ['P', []],
    ['Q', []],
    ['R', []],
    ['S', []],
    ['T', []],
    ['U', []],
    ['V', []],
    ['W', []],
    ['X', []],
    ['Y', []],
    ['Z', []]
]);

const messageIds = new Map([
    ['A', []],
    ['B', []],
    ['C', []],
    ['D', []],
    ['E', []],
    ['F', []],
    ['G', []],
    ['H', []],
    ['I', []],
    ['J', []],
    ['K', []],
    ['L', []],
    ['M', []],
    ['N', []],
    ['O', []],
    ['P', []],
    ['Q', []],
    ['R', []],
    ['S', []],
    ['T', []],
    ['U', []],
    ['V', []],
    ['W', []],
    ['X', []],
    ['Y', []],
    ['Z', []]
]);

// module.exports = {
//     data: new SlashCommandBuilder()
//         .setName('addAll')
//         .setDescription('Adds the user to the blacklist'),
//     async execute(interaction: CommandInteraction, channel: Channel) {
//         if ((interaction.channel as TextChannel).name !== 'blacklist') {
//             console.log('channel was not a blacklist');
//             await interaction.reply('channel is not a blacklist');
//             return;
//         }
//         const names = await getAllMessages(channel);

//         //-------- save blacklist to file here -------

//         //delete old messages
//         deleteOldMessages(channel);


//         // Util.splitMessage(message).forEach(async e => {
//         //     await channel.send(e);
//         // });

//         //FIXME
//         //might take more than 3 seconds so if it starts failing that might be why
//         //a fix does exist with an other type of reply
//         await interaction.reply('aded to list ' + names[0]);
//     },
// };


async function addAll(channel: TextBasedChannels, blacklist: Blacklist): Promise<string[]> {
    let names: string[] = [];
    // channel
    await channel.messages.fetch().then(messages => {
        console.log(`Received ${messages.size} messages`);
        //Iterate through the messages here with the variable "messages".
        messages.forEach(msg => {
            if (msg.content.startsWith('--')) {
                blacklist.addOld(msg)
            } else if (msg.content.toLowerCase().startsWith('add ')) {
                blacklist.add(msg.content.slice(4))
                // addToBl(msg.content.slice(4));
                // chatListIds.push(msg.id);
            }
            console.log(msg.content);
        });
    });
    return names.reverse();
}

async function deleteOldMessages(channel: TextBasedChannels) {
    chatListIds.forEach(id =>
        channel.messages.fetch(id).then(msg =>
            msg.delete()
        )
    );
}

function addOldToBl(list: string) {
    list.split('\n').forEach(name => addToBl(name));
}

function addToBl(name: string) {
    const first = name.charAt(0).toUpperCase();
    _blacklist.get(first)!.push(name.trim());
}

async function postBl(channel: TextBasedChannels) {
    if (messageIds.get('A')!.length < 2) {
        _blacklist.forEach(async messages => {
            await channel.send(messages.join('\n'));
        });
        //clear chat????????
        return;
    }
}

// convert JSON object to string
// const data = JSON.stringify(user);

// write JSON string to a file
function saveToFile(blacklist: Map<string, string[]>) {
    fs.writeFile('Blacklist.json', JSON.stringify([...blacklist], null, 4), (err: any) => {
        if (err) {
            throw err;
        }
        console.log("JSON data is saved.");
    });
}

function getFromFile() {
    let map;
    fs.readFile('Blacklist.json', 'utf-8', (err: NodeJS.ErrnoException | null, data: string) => {
        if (err) {
            throw err;
        }

        // parse JSON object
        map = new Map(JSON.parse(data));

        // print JSON object
        console.log(map);
    });
    return map;
}

class Blacklist {

    private blacklist: Map<string, string[]>; // the content of the old messages
    private oldMessages: Map<string, Message>; //the old messages for editing the messages
    private toDelete: string[]; //list of ids to delete
    private refresh: boolean;
    private channel: TextBasedChannels;

    constructor(toRefresh: boolean, channel: TextBasedChannels) {
        this.blacklist = new Map<string, string[]>()
        this.oldMessages = new Map<string, Message>()
        this.toDelete = [];
        this.refresh = toRefresh;
        this.channel = channel;
    }

    addOld(message: Message) {
        message.content.split('\n').forEach(name => this.add(name));
        this.oldMessages.set(message.content.charAt(2), message)
        if (message.author.id != '915952587273023508') { // if it isn't this bot that send the message then delete the message
            this.toDelete.push(message.id)
            this.refresh = true
        }
    }

    // async addNew(name: string): Promise<boolean> { //implement refresh --------------------------------        
    //     const char = name.charAt(0);

    //     var mess: string[] = [];


    //     //add something that finds the old message id from a json file
    //     await this.channel.messages.fetch().then(messages => {
    //         messages.forEach(msg => {
    //             if (!this.refresh && msg.author.id != '915952587273023508') {
    //                 this.refresh = true;
    //             }
    //             if (msg.content.startsWith('--' + char)) {
    //                 msg.content.split('\n').forEach(name => mess.push(name));
    //             }
    //             mess.push(name)
    //             mess.sort()
    //             if (this.refresh) {
    //                 this.add(name)
    //                 return;
    //             } else {
    //                 msg.edit(mess.join('\n'))
    //             }
    //             console.log(mess);
    //             return;
    //         });
    //     });

    //     return this.refresh;
    // }

    add(message: string) {
        let char: string;

        if (new RegExp(`^--[A-Z]--`).test(message)) {
            char = message.charAt(2).toLocaleUpperCase()
        } else char = message.charAt(0).toLocaleUpperCase();

        if (this.blacklist.has(char)) {
            this.blacklist.get(char)?.push(message);
            return;
        }

        this.blacklist.set(char, new Array(message))
    }

    updateOldMessages() {
        this.oldMessages.forEach(async (message, key) =>
            await this.updateMessage(
                message,
                this.blacklist.get(key)
            )
        )
    }

    async updateMessage(message: Message | undefined, list: string[] | undefined) {
        if (!list) return; //if undifined, nan, null, '', 0 or false

        list.sort();

        try {
            message?.edit(list.join('\n'))
        } catch (err) {

        }

        console.log(`updated message ${message?.id} with new content`);
    }

    async writeToChat() {
        this.blacklist = new Map([...this.blacklist].sort())
        this.blacklist.forEach(item => {
            console.log(item);
            item.sort()
            const joined = item.join('\n')
            this.channel.send(joined)
        })
    }

    async cleanChat(includeOld: boolean = false) {
        if (includeOld) {
            this.oldMessages.forEach(async msg => await msg.delete())
        }

        this.toDelete.forEach(async id => await (await this.channel.messages.fetch(id)).delete())
    }

    // getToDelete(): string {
    //     return this.oldMessages.toString().replaceAll(',', '\n'); //yeah no that wont work my friend
    // }

    getRefresh(): boolean {
        return this.refresh;
    }

}
