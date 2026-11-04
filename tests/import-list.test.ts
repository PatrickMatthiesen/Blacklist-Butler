import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test';
import { type ChatInputCommandInteraction, Collection, MessageFlags, type Message } from 'discord.js';
import { importList } from '../src/commands/import-list.js';
import { LocalBlacklistStore } from '../src/objects/local-blacklist-store.js';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const originalStoreType = process.env.STORE_TYPE;
beforeEach(() => { process.env.STORE_TYPE = 'local'; });
afterEach(() => {
    mock.restore();
    if (originalStoreType === undefined) delete process.env.STORE_TYPE;
    else process.env.STORE_TYPE = originalStoreType;
});

function fixture(action: 'confirm' | 'cancel' | 'timeout' | 'changed' = 'confirm', firstId = '100000000000000001') {
    const saveBlacklist = spyOn(LocalBlacklistStore.prototype, 'saveBlacklist').mockResolvedValue(undefined);
    const saveMessages = spyOn(LocalBlacklistStore.prototype, 'saveMessages').mockResolvedValue(undefined);
    const saveConfig = spyOn(LocalBlacklistStore.prototype, 'saveConfig').mockResolvedValue(undefined);
    const loadBlacklist = spyOn(LocalBlacklistStore.prototype, 'loadBlacklist').mockResolvedValue(new Map());
    const loadMessages = spyOn(LocalBlacklistStore.prototype, 'loadMessages').mockResolvedValue(new Map());
    spyOn(LocalBlacklistStore.prototype, 'loadConfig').mockResolvedValue(new Map([['other', 'keep']]));
    const messages = [
        { id: '100000000000000003', content: '**--B--**\nBob', author: { id: 'bot' }, edit: mock(), delete: mock() },
        { id: '100000000000000001', content: '**--A--**\na_fixture_one\nA-Test-Two', author: { id: 'bot' }, edit: mock(), delete: mock() },
    ];
    const fetch = mock(async (query: { message?: string; before?: string; limit?: number }) => {
        if (query.message) {
            const found = messages.find(message => message.id === query.message);
            if (!found) throw new Error('Unknown message');
            return found;
        }
        return new Collection(messages.filter(message => !query.before || BigInt(message.id) < BigInt(query.before))
            .map(message => [message.id, message]));
    });
    const channel = { id: 'channel', name: 'blacklist', isTextBased: () => true, messages: { fetch }, send: mock() };
    const confirmation = {
        user: { id: 'user' }, customId: action === 'cancel' ? 'cancel-import' : 'confirm-import',
        update: mock(async () => {}),
        deferUpdate: mock(async () => {
            if (action === 'changed') messages[1].content += '\nChangedInProduction';
        }),
    };
    const reply = {
        awaitMessageComponent: mock(async (options: { filter: (candidate: typeof confirmation) => unknown }) => {
            expect(saveBlacklist).not.toHaveBeenCalled();
            expect(saveMessages).not.toHaveBeenCalled();
            expect(saveConfig).not.toHaveBeenCalled();
            expect(options.filter({ ...confirmation, user: { id: 'other-user' } })).toBe(false);
            if (action === 'timeout') throw new Error('Collector timed out');
            return confirmation;
        }),
    };
    const interaction = {
        channel, guildId: 'guild', channelId: 'channel', user: { id: 'user' }, client: { user: { id: 'bot' } },
        inGuild: () => true,
        showModal: mock(async () => {}),
        reply: mock(async () => {}),
        deferReply: mock(async () => {}),
        options: { getString: mock((name: string, required: boolean) => { expect(required).toBe(true); return name === 'first-id' ? firstId : '100000000000000003'; }) },
        editReply: mock(async (options: { content: string }) => { void options; return reply; }),
    };
    return { interaction, confirmation, messages, channel, saveBlacklist, saveMessages, saveConfig, loadBlacklist, loadMessages };
}

test('slash options lead directly to a private preview and confirmation saves the list', async () => {
    const run = fixture();
    await importList(run.interaction as unknown as ChatInputCommandInteraction);
    expect(run.interaction.showModal).not.toHaveBeenCalled();
    expect(run.interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
    expect(run.interaction.options.getString.mock.calls).toEqual([['first-id', true], ['last-id', true]]);
    expect(run.interaction.editReply.mock.calls.some(([options]) => options.content.includes('2 letter sections and 3 names'))).toBe(true);
    expect(run.saveConfig.mock.calls[0][0]).toEqual(new Map([['other', 'keep'], ['blPrefix', '**--']]));
    expect(run.saveBlacklist.mock.calls[0][0].get('A')).toEqual(['**--A--**', 'a_fixture_one', 'A-Test-Two']);
    expect(run.saveMessages.mock.calls[0][0].get('A')?.id).toBe('100000000000000001');
    expect(run.channel.send).not.toHaveBeenCalled();
    for (const message of run.messages) {
        expect(message.edit).not.toHaveBeenCalled();
        expect(message.delete).not.toHaveBeenCalled();
    }
});

test.each(['cancel', 'timeout', 'changed'] as const)('%s leaves stored list and channel messages untouched', async action => {
    const run = fixture(action);
    await importList(run.interaction as unknown as ChatInputCommandInteraction);
    expect(run.saveBlacklist).not.toHaveBeenCalled();
    expect(run.saveMessages).not.toHaveBeenCalled();
    expect(run.saveConfig).not.toHaveBeenCalled();
    expect(run.channel.send).not.toHaveBeenCalled();
    for (const message of run.messages) {
        expect(message.edit).not.toHaveBeenCalled();
        expect(message.delete).not.toHaveBeenCalled();
    }
    if (action === 'changed') expect(run.interaction.editReply.mock.calls.at(-1)![0].content).toContain('list changed');
});

test('invalid IDs return a private error without saving or posting anything', async () => {
    const run = fixture('confirm', 'not-an-id');
    await importList(run.interaction as unknown as ChatInputCommandInteraction);
    expect(run.saveBlacklist).not.toHaveBeenCalled();
    expect(run.saveMessages).not.toHaveBeenCalled();
    expect(run.saveConfig).not.toHaveBeenCalled();
    expect(run.channel.send).not.toHaveBeenCalled();
    expect(run.interaction.editReply).toHaveBeenCalled();
});

test('first import does not warn about replacing a saved list', async () => {
    const run = fixture('cancel');
    await importList(run.interaction as unknown as ChatInputCommandInteraction);
    expect(run.interaction.editReply.mock.calls[0][0].content).not.toContain('replace');
});

test('replacement preview identifies the channel of the saved list', async () => {
    const run = fixture('cancel');
    run.loadBlacklist.mockResolvedValue(new Map([['A', ['**--A--**', 'Saved']]]));
    run.loadMessages.mockResolvedValue(new Map([['A', { id: 'old-message', channelId: '100000000000000099' } as unknown as Message]]));
    await importList(run.interaction as unknown as ChatInputCommandInteraction);
    expect(run.interaction.editReply.mock.calls[0][0].content).toContain('replace the saved blacklist from <#100000000000000099>');
    expect(run.saveBlacklist).not.toHaveBeenCalled();
});

test('older saved lists without channel information get a generic replacement warning', async () => {
    const run = fixture('cancel');
    run.loadBlacklist.mockResolvedValue(new Map([['A', ['**--A--**']]]));
    await importList(run.interaction as unknown as ChatInputCommandInteraction);
    expect(run.interaction.editReply.mock.calls[0][0].content).toContain("replace the guild's saved blacklist");
    expect(run.interaction.editReply.mock.calls[0][0].content).not.toContain('<#');
});

test('first local import saves the inferred prefix without a pre-existing config file', async () => {
    const run = fixture();
    mock.restore(); // Exercise the real local store, including configuration reads and writes.
    const originalCwd = process.cwd();
    const directory = await mkdtemp(join(tmpdir(), 'blacklist-new-local-'));
    try {
        process.chdir(directory);
        await importList(run.interaction as unknown as ChatInputCommandInteraction);
        expect(run.interaction.editReply.mock.calls.at(-1)![0].content).toContain('Imported 3 names');
        const store = new LocalBlacklistStore('guild');
        expect((await store.loadConfig()).get('blPrefix')).toBe('**--');
        expect((await store.loadBlacklist()).get('A')).toEqual(['**--A--**', 'a_fixture_one', 'A-Test-Two']);
        expect((await store.loadMessages()).get('A')?.id).toBe('100000000000000001');
        expect(run.channel.send).not.toHaveBeenCalled();
    } finally {
        process.chdir(originalCwd);
        if (directory.startsWith(join(tmpdir(), 'blacklist-new-local-'))) await rm(directory, { recursive: true, force: true });
    }
});

test.each(['malformed', 'directory'] as const)('local configuration preserves %s file errors', async kind => {
    const originalCwd = process.cwd();
    const directory = await mkdtemp(join(tmpdir(), 'blacklist-local-config-'));
    const configPath = join(directory, 'guilds', 'guild', 'config.json');
    try {
        await mkdir(join(directory, 'guilds', 'guild'), { recursive: true });
        if (kind === 'malformed') await writeFile(configPath, 'invalid json');
        else await mkdir(configPath);
        process.chdir(directory);
        await expect(new LocalBlacklistStore('guild').loadConfig()).rejects.toThrow();
        if (kind === 'malformed') expect(await readFile(configPath, 'utf8')).toBe('invalid json');
    } finally {
        process.chdir(originalCwd);
        if (directory.startsWith(join(tmpdir(), 'blacklist-local-config-'))) await rm(directory, { recursive: true, force: true });
    }
});
