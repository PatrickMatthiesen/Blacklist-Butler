import { Channel, CommandInteraction, TextBasedChannels } from 'discord.js';
import { Discord, Slash } from 'discordx';
import * as fs from "fs"

@Discord()
abstract class AppDiscord {
	@Slash("ping", {description: 'Replies with Pong!'} )
	private async ping(interaction: CommandInteraction) {
		await interaction.reply('Pong!');
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


async function getAllMessages(channel: TextBasedChannels) {
    let names: string[] = [];
    channel
    await channel.messages.fetch().then(messages => {
        console.log(`Received ${messages.size} messages`);
        //Iterate through the messages here with the variable "messages".
        messages.forEach(message => {
            if (message.content.startsWith('--')) {
                addOldToBl(message.content);
                chatListIds.push(message.id);
            } else if (message.content.toLowerCase().startsWith('add ')) {
                addToBl(message.content.slice(4));
                chatListIds.push(message.id);
            }
            console.log(message.content);
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