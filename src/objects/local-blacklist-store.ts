import { Message } from 'discord.js';
import { BlacklistStore } from '../interfaces/blacklist-store.js';

export class LocalBlacklistStore implements BlacklistStore {
    private folderPath: string;

    constructor(guildId: string) {
        this.folderPath = `./guilds/${guildId}`;
    }

    async load(): Promise<{ blacklist: Map<string, string[]>; messages: Map<string, Message<boolean>>; }> {
        return {
            'blacklist': await this.loadBlacklist(),
            'messages': await this.loadMessages()
        };
    }

    async loadBlacklist(): Promise<Map<string, string[]>> {
        const file = Bun.file(`${this.folderPath}/Blacklist.json`);

        if (!await file.exists()) {
            console.log('blacklist file does not exist');
            console.log('creating blacklist file ' + file.name);
            
            const list = new Map<string, string[]>();
            await Bun.write(file, JSON.stringify([...list], null, 4));
            return list;
        }

        const data = await file.json();
        const blacklist = new Map<string, string[]>(data);
        return blacklist;
    }

    async loadMessages(): Promise<Map<string, Message>> {
        // load the message ids file
        const file = Bun.file(`${this.folderPath}/messages.json`);

        if (!file.exists()) {
            const list = new Map<string, Message>();

            Bun.write(file, JSON.stringify([...list], null, 4));
            return list;
        }

        const data = await file.json();
        const messages = new Map<string, Message>(data);
        return messages;
    }

    async loadConfig(): Promise<Map<string, string>> {
        // load the config file
        const file = Bun.file(`${this.folderPath}/config.json`);
        const config = await file.json();
        if (config) {
            return new Map<string, string>(config);
        }
        return new Map<string, string>();
    }

    async loadByName(name: string): Promise<string | null> {
        const file = Bun.file(`${this.folderPath}/${name}.json`);
        if (await file.exists()) {
            return file.text();
        }
        return null;
    }

    async save(blacklist: Map<string, string[]>, idMap: Map<string, Message>): Promise<void> {
        await this.saveBlacklist(blacklist);
        await this.saveMessages(idMap);
    }

    async saveBlacklist(blacklist: Map<string, string[]>): Promise<void> {
        await Bun.write(`${this.folderPath}/Blacklist.json`, JSON.stringify([...blacklist], null, 4));
    }

    async saveMessages(idMap: Map<string, Message>): Promise<void> {
        await Bun.write(`${this.folderPath}/messages.json`, JSON.stringify([...idMap], null, 4));
    }

    async saveConfig(config: Map<string, string>): Promise<void> {
        await Bun.write(`${this.folderPath}/config.json`, JSON.stringify([...config], null, 4));
    }

    async saveByName(name: string, file: string | Buffer): Promise<void> {
        await Bun.write(`${this.folderPath}/${name}.json`, file);
    }
}
