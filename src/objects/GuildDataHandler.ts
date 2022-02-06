import * as fs from 'fs';
import path from 'path';

function getFile(guildId: string, fileName: string) {
    if (hasFile(guildId, fileName)) {
        const filePath = getGuildFilePath(guildId, fileName);
        return fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf-8');
    }
    return null;
}

function hasFile(guildId: string, fileName: string) {
    const filePath = getGuildFilePath(guildId, fileName);
    return fs.existsSync(filePath);
}

function save(filePath: string, toSave: object) {
    fs.writeFileSync(filePath, JSON.stringify(toSave, null, 4));
}

export function getGuildBlPrefix(guildId: string) {
    const config = getConfig(guildId);
    const blPrefix = config?.get('blPrefix') ?? '**--';
    console.log(blPrefix);
    return blPrefix;
}

export function setGuildBlPrefix(guildId: string, prefix: string) {
    const config = getConfig(guildId);
    if (config) {
        config?.set('blPrefix', prefix);
        saveConfig(guildId, config);
        return true;
    }
    return false;
}

// function appendKey(guildId: string, fileName: string, key: string, value: string) {
//     const map = getFile(guildId, fileName);
//     if (map) {
//         if (map.has(key)) map.get(key)?.concat(',' + value);
//         else map.set(key,value);
//         return true;
//     }
//     return false;
// }

// function setKey(guildId: string, fileName: string, key: string, value: string) {
//     const map = getFile(guildId, fileName);
//     if (map) {
//         map.set(key,value);
//         return true;
//     }
//     return false;
// }

// function getValue(guildId: string, fileName: string, key: string) {
//     const map = getFile(guildId, fileName);
//     if (map) {
//         return map.get(key);
//     }
// }

export function saveConfig(guildId: string, config: Map<string, string>) {
    save(getGuildFilePath(guildId, 'config'), [...config]);
}

export function getConfig(guildId: string) {
    const config = getFile(guildId, 'config');
    if (config) {
        return new Map<string, string>(JSON.parse(config));
    }
    return null;
}

export function getRoleIds(guildId: string) {
    const config = getConfig(guildId);
    if (config && config.has('roles')) {
        return config.get('roles')?.split(',') ?? [];
    }
    return [];
}


function getGuildFilePath(guildId: string, fileName: string) {
    return './guilds/' + guildId + '/' + fileName + '.json';
}