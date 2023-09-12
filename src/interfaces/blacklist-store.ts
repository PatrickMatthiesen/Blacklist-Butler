import { Message } from "discord.js";

export interface BlacklistStore {
    load: () => Promise<{ blacklist: Map<string, string[]>; messages: Map<string, Message<boolean>>; }>;
    loadBlacklist: () => Promise<Map<string, string[]>>;
    loadMessages: () => Promise<Map<string, Message>>;
    loadConfig: () => Promise<Map<string, string>>;
    loadByName: (name: string) => Promise<string | null>;


    save: (blacklist: Map<string, string[]>, idMap: Map<string, Message>) => Promise<void>;
    saveBlacklist: (Blacklist: Map<string, string[]>) => Promise<void>;
    saveMessages: (idMap: Map<string, Message>) => Promise<void>;
    saveConfig: (config: Map<string, string>) => Promise<void>;
    saveByName: (name: string, file: string | Buffer) => Promise<void>;
}