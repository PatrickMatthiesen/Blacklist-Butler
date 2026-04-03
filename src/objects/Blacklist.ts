import { Message, TextBasedChannel, TextChannel } from "discord.js";
import { BlacklistStore } from "../interfaces/blacklist-store.js";

export type BlacklistWriteFailureReason = 'cannot-write' | 'rewrite-required';

export class BlacklistWriteError extends Error {
    reason: BlacklistWriteFailureReason;

    constructor(reason: BlacklistWriteFailureReason, message: string) {
        super(message);
        this.name = 'BlacklistWriteError';
        this.reason = reason;
    }
}

export class Blacklist {
    private blacklist: Map<string, string[]>; // the content of the old messages
    private messages: Map<string, Message>; //the old messages for editing the messages
    private config: Map<string, string>;
    private prefix: string;
    private channel: TextBasedChannel;
    private store: BlacklistStore;
    private toDelete: Message[]; //list of ids to delete

    constructor(channel: TextBasedChannel, store: BlacklistStore) {
        this.blacklist = new Map<string, string[]>();
        this.messages = new Map<string, Message>();
        this.config = new Map<string, string>();
        this.prefix = '';
        this.toDelete = [];
        this.channel = channel;
        this.store = store;
    }

    async init() {
        this.blacklist = await this.store.loadBlacklist();
        this.messages = await this.store.loadMessages();
        this.config = await this.store.loadConfig();
        this.prefix = this.config.get('blPrefix') ?? this.config.get('prefix') ?? '***--'; // if something goes wrong we assume the prefix is the default

        if (this.isEmpty()) {
            this.initEmpty();
        }
    }

    resetForImport() {
        this.blacklist = new Map<string, string[]>();
        this.messages = new Map<string, Message>();
        this.toDelete = [];
        this.initEmpty();
    }

    initEmpty() {
        for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWYXZ') {
            this.blacklist.set(letter, [this.prefix + letter + this.prefix.split('').reverse().join('')]);
        }
    }

    channelGuildId() {
        return (this.channel as TextChannel).guildId;
    }

    addOld(message: Message) {
        message.content.split('\n').forEach(name => this.add(name));
        this.messages.set(message.content.charAt(this.prefix.length), message);
        if (message.author.id != '915952587273023508') { // if it isn't this bot that send the message then delete the message
            this.toDelete.push(message);
        }
    }

    add(message: string) {
        const char = this.getChar(message);

        if (this.blacklist.has(char)) {
            this.blacklist.get(char)?.push(message);
            return;
        }

        this.blacklist.set(char, new Array(message));
    }

    async addOne(name: string) {
        console.log('adds ' + name);
        console.log(this.blacklist);
        console.log(typeof this.blacklist);

        this.add(name);
        this.sort();

        const char = this.getChar(name);

        await this.updateMessage(char);


        await this.saveBlacklist();
        await this.saveMessages();
        return true;
    }

    async removeOne(name: string) {
        console.log('removes ' + name);

        this.remove(name);
        this.sort();
        console.log('sorted');


        const char = this.getChar(name);
        console.log('got char');

        await this.updateMessage(char);
        console.log('updated message');

        await this.saveBlacklist();
        await this.saveMessages();
        console.log('saved blacklist');
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
        for (const key of this.messages.keys()) {
            await this.updateMessage(key);
        }
    }

    async updateMessage(char: string) {
        const msgid = this.messages.get(char)?.id;
        const names = this.blacklist.get(char);
        if (!names) return false;

        if (!msgid) {
            throw new BlacklistWriteError('rewrite-required', 'No stored blacklist message found for this letter');
        }

        try {
            const msg = await this.channel.messages.fetch(msgid);

            await msg.edit(names.join('\n'));
            this.messages.set(char, msg);
            console.log('eddited message ' + msgid);
            return true;
        } catch (error) {
            throw this.mapWriteError(error);
        }
    }

    async writeToChat() {
        this.sort();
        this.messages = new Map;
        for (const item of this.blacklist.values()) {
            const joined = item.join('\n');
            await this.sendAndSave(joined);
        }
        console.log('messages sent');
    }

    async sendAndSave(text: string) {
        let msg: Message;
        const channel = this.channel as TextChannel;

        try {
            msg = await channel.send(text);
        } catch (error) {
            throw this.mapWriteError(error);
        }

        this.messages.set(text.charAt(this.prefix.length), msg);
    }

    async cleanChat(includeOld = false) {
        if (includeOld) {
            this.messages.forEach(async msg => await msg.delete());
            console.log('deleted old messages');
        }

        this.toDelete.forEach(async msg => await msg.delete());
        console.log('Cleaned chat');

    }

    addToDelete(msg: Message) {
        this.toDelete.push(msg);
    }

    sort() {
        this.blacklist = new Map([...this.blacklist].sort());
        this.blacklist.forEach(list => {
            list.sort((a, b) => a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase()));
        });
        console.log('Sorted the Blacklist');
    }

    async saveBlacklist() {
        this.sort();
        await this.store.saveBlacklist(this.blacklist);
    }

    async saveMessages() {
        await this.store.saveMessages(this.messages);
    }

    private getChar(message: string) {
        if (new RegExp(`^${this.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[A-Z]`).test(message)) { //^[\\*]*--[A-Z]--
            return message.charAt(this.prefix.length).toLocaleUpperCase();
        } else return message.charAt(0).toLocaleUpperCase();
    }

    isEmpty() {
        return this.blacklist.size == 0;
    }

    hasStoredNames() {
        for (const list of this.blacklist.values()) {
            if (list.length > 1) {
                return true;
            }
        }

        return false;
    }

    getPrefix() {
        return this.prefix;
    }

    private mapWriteError(error: unknown) {
        const code = this.getDiscordErrorCode(error);

        if (code === 10008) {
            return new BlacklistWriteError('rewrite-required', 'Stored blacklist message no longer exists in this channel');
        }

        if (code === 50001 || code === 50005 || code === 50013) {
            return new BlacklistWriteError('cannot-write', 'The bot cannot write to the blacklist in this channel');
        }

        if (error instanceof Error) {
            return error;
        }

        return new Error(String(error));
    }

    private getDiscordErrorCode(error: unknown) {
        if (typeof error !== 'object' || error === null || !('code' in error)) {
            return undefined;
        }

        const code = (error as { code: unknown }).code;
        return typeof code === 'number' ? code : undefined;
    }
}
