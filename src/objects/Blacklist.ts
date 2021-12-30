import { Message, TextBasedChannels, TextChannel } from "discord.js";
import * as fs from "fs";

export class Blacklist {

    private blacklist: Map<string, string[]>; // the content of the old messages
    private oldMessages: Map<string, Message>; //the old messages for editing the messages
    private toDelete: Message[]; //list of ids to delete
    private refresh: boolean;
    private channel: TextBasedChannels;

    constructor(toRefresh: boolean, channel: TextBasedChannels) {
        this.blacklist = new Map<string, string[]>();
        this.oldMessages = new Map<string, Message>();
        this.toDelete = [];
        this.refresh = toRefresh;
        this.channel = channel;
    }

    addOld(message: Message) {
        message.content.split('\n').forEach(name => this.add(name));
        this.oldMessages.set(message.content.charAt(4), message);
        if (message.author.id != '915952587273023508') { // if it isn't this bot that send the message then delete the message
            this.toDelete.push(message);
            this.refresh = true;
        }
    }

    add(message: string) {
        let char: string;

        if (new RegExp(`^--[A-Z]--`).test(message)) {
            char = message.charAt(4).toLocaleUpperCase();
        } else char = message.charAt(0).toLocaleUpperCase();

        if (this.blacklist.has(char)) {
            this.blacklist.get(char)?.push(message);
            return;
        }

        this.blacklist.set(char, new Array(message));
    }

    async addOne(name: string) {
        console.log('adds ' + name);

        this.add(name);
        this.sort();

        const char = name.charAt(0).toUpperCase();

        await this.updateMessage(char);


        this.saveBlacklistToFile();
        return true;
    }

    async removeOne(name: string) {
        console.log('removes ' + name);

        this.remove(name);
        this.sort();

        const char = name.charAt(0).toUpperCase();

        await this.updateMessage(char);


        this.saveBlacklistToFile();
        return true;
    }

    remove(name: string) {
        const char = name.charAt(0).toUpperCase();

        const list = this.blacklist.get(char) ?? [];
        if (list.length === 0) return;

        const index = list.indexOf(name);
        console.log('removed ' + list.splice(index, 1));
    }


    async updateAllMessages() {
        this.sort();
        for (const key of this.oldMessages.keys()) {
            await this.updateMessage(key);
        }
    }

    async updateMessage(char: string) {
        const msgid = this.oldMessages.get(char)?.id;
        const names = this.blacklist.get(char);
        if (!msgid || !names) return false;

        const msg = await this.channel.messages.fetch(msgid);

        msg.edit(names.join('\n'));
        console.log('eddited message ' + msgid);
    }

    async writeToChat() {
        this.sort();
        for (const item of this.blacklist.values()) {
            const joined = item.join('\n');
            await this.sendAndSave(joined);
        }
        console.log('messages sent');
    }

    async sendAndSave(text: string) {
        const msg = await this.channel.send(text);
        this.oldMessages.set(text.charAt(4), msg);
    }

    async cleanChat(includeOld = false) {
        if (includeOld) {
            this.oldMessages.forEach(async msg => await msg.delete());
            console.log('deleted old messages');
        }

        this.toDelete.forEach(async msg => await msg.delete());
        console.log('deleted messages');

    }

    addToDelete(msg: Message) {
        this.toDelete.push(msg);
    }

    getRefresh(): boolean {
        return this.refresh;
    }

    sort() {
        this.blacklist = new Map([...this.blacklist].sort());
        this.blacklist.forEach(list => {
            list.sort((a, b) => a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase()));
        });
        console.log('sorted the list');

        // for (const item of this.blacklist.values()) {
        //     item.sort((a, b) => a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase()));
        // }
    }

    saveBlacklistToFile() {
        this.sort();
        fs.writeFile('Blacklist.json', JSON.stringify([...this.blacklist], null, 4), err => {
            if (err) {
                throw err;
            }
            console.log("blacklist is saved as JSON data");
        });
    }

    saveMessageIdsToFile() {
        fs.writeFileSync('messageIds.json', JSON.stringify([...this.oldMessages], null, 4));
        // , (err: any) => {
        //     if (err) {
        //         throw err;
        //     }
        // });
        console.log("message ids is saved as JSON data");
    }

    loadFromFile() {
        this.loadBlacklist();
        this.loadMessageIds();
    }

    private loadBlacklist() {
        try {
            const data = fs.readFileSync('guilds\\' + (this.channel as TextChannel).guildId + '\\Blacklist.json', 'utf-8');

            // parse JSON object
            this.blacklist = new Map(JSON.parse(data)); // not posible if the file is empty

            // print JSON object
            console.log('the parsed messages map object:\n' + this.blacklist);
            console.log(this.blacklist.get('A'));
        } catch (error) {
            console.log(error);
        }
    }

    private loadMessageIds() {
        try {
            const idMap = fs.readFileSync('guilds\\' + (this.channel as TextChannel).guildId + '\\messageIds.json', 'utf-8');

            // parse JSON object
            this.oldMessages = new Map(JSON.parse(idMap)); // not posible if the file is empty

            // print JSON object
            console.log('the parsed messages map object:\n' + this.blacklist);
        } catch (error) {
            console.log(error);
        }
    }

    isEmpty(): boolean {
        return this.blacklist.size == 0;
    }

}
