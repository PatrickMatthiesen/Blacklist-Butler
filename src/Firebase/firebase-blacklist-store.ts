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

    private async loadFromFirebase(path: string): Promise<string> {
        const file = this.store.bucket().file(path);
        const fileUrl = await file.getSignedUrl({
            action: "read",
            expires: Date.now() + 1000 * 60 // 1 minute
          })
          const fileContent = await (await Bun.fetch(fileUrl[0])).text();
        return fileContent;
    }

    async loadBlacklist(): Promise<Map<string, string[]>> {
        const data = await this.loadFromFirebase(`${this.folderPath}/Blacklist.json`);
        return new Map<string, string[]>(JSON.parse(data));
    }

    async loadMessages(): Promise<Map<string, Message>> {
        const data = await this.loadFromFirebase(`${this.folderPath}/messages.json`);
        return new Map<string, Message>(JSON.parse(data));
    }

    async loadConfig(): Promise<Map<string, string>> {
        const data = await this.loadFromFirebase(`${this.folderPath}/config.json`);
        return new Map<string, string>(JSON.parse(data));
    }

    async loadByName(name: string): Promise<string | null> {
        const data = await this.loadFromFirebase(`${this.folderPath}/${name}.json`);
        return data;
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