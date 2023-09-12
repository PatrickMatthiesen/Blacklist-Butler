import { BlacklistStore } from '../interfaces/blacklist-store.js';
import { getStorage, Storage } from "firebase-admin/storage";
import { Message } from 'discord.js';

export class FirebaseBlacklistStore implements BlacklistStore {
    private folderPath: string;
    private store: Storage;

    constructor(guildId: string) {
        this.folderPath = `guilds/${guildId}`;

        this.store = getStorage();
    }

    async load(): Promise<{ blacklist: Map<string, string[]>; messages: Map<string, Message<boolean>>; }> {
        return {
            'blacklist': await this.loadBlacklist(),
            'messages': await this.loadMessages()
        };
    }

    async loadBlacklist(): Promise<Map<string, string[]>> {
        const [contents] = await this.store.bucket().file(`${this.folderPath}/Blacklist.json`).download();
        const fileContent = contents.toString();
        return new Map(JSON.parse(fileContent));
    }

    async loadMessages(): Promise<Map<string, Message>> {
        const [contents] = await this.store.bucket().file(`${this.folderPath}/messages.json`).download();
        const fileContent = contents.toString();
        return new Map(JSON.parse(fileContent));
    }

    async loadConfig(): Promise<Map<string, string>> {
        const [contents] = await this.store.bucket().file(`${this.folderPath}/config.json`).download();
        const fileContent = contents.toString();
        return new Map(JSON.parse(fileContent));
    }

    async loadByName(name: string): Promise<string | null> {
        const [contents] = await this.store.bucket().file(`${this.folderPath}/${name}.json`).download();
        return contents.toString();
    }

    async save(blacklist: Map<string, string[]>, messages: Map<string, Message>) {
        await this.saveBlacklist(blacklist);
        await this.saveMessages(messages);
    }

    async saveBlacklist(blacklist: Map<string, string[]>): Promise<void> {
        const file = this.store.bucket().file(`${this.folderPath}/Blacklist.json`);
        await file.save(JSON.stringify([...blacklist], null, 4), {
            gzip: true,
            contentType: 'application/json'
        });
    }

    async saveMessages(messages: Map<string, Message<boolean>>) {
        const file = this.store.bucket().file(`${this.folderPath}/messages.json`);
        await file.save(JSON.stringify([...messages], null, 4), {
            gzip: true,
            contentType: 'application/json'
        });
    }

    async saveConfig(config: Map<string, string>) {
        const file = this.store.bucket().file(`${this.folderPath}/config.json`);
        await file.save(JSON.stringify([...config], null, 4), {
            gzip: true,
            contentType: 'application/json'
        });
    }

    async saveByName(name: string, data: string | Buffer) {
        const file = this.store.bucket().file(`${this.folderPath}/${name}.json`);
        await file.save(data, { 
            gzip: true, 
            contentType: 'application/json' 
        });
    }
}