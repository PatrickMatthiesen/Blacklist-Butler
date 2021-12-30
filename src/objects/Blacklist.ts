import { Message, TextBasedChannels } from "discord.js";
import * as fs from "fs"

export class Blacklist {

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
        console.log("list is ok");
        
        list.sort();

        try {
            message?.edit(list.join('\n'))
        } catch (err) {
            console.log(err);
            
        }

        console.log(`updated message ${message?.id} with new content`);
    }

    async writeToChat() {
        this.blacklist = new Map([...this.blacklist].sort())
        this.blacklist.forEach(item => {
            console.log(item);
            item.sort((a, b) => a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase()))
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

    saveToFile() {
        fs.writeFile('Blacklist.json', JSON.stringify([...this.blacklist], null, 4), (err: any) => {
            if (err) {
                throw err;
            }
            console.log("blacklist is saved as JSON data");
        });
    }

    loadFromFile() {
        const data = fs.readFileSync('Blacklist.json', 'utf-8');

        // parse JSON object
        this.blacklist = new Map(JSON.parse(data)); // not posible if the file is empty
        
        // print JSON object
        console.log('the parsed map object:\n' + this.blacklist);

        //  (err: NodeJS.ErrnoException | null, data: string) => {
        //     if (err) {
        //         throw err;
        //     }

        // });
    }

    isEmpty(): boolean {
        return this.blacklist.size == 0
    }

}
