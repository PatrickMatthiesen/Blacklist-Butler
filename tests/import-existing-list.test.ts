import { afterEach, beforeEach, expect, mock, test } from 'bun:test';
import { Collection, type CommandInteraction } from 'discord.js';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlacklistCommands } from '../src/commands/addToList.js';

const originalCwd = process.cwd();
const originalStoreType = process.env.STORE_TYPE;
let directory: string;

beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'blacklist-import-'));
    await mkdir(join(directory, 'guilds', 'import-test'), { recursive: true });
    await writeFile(join(directory, 'guilds', 'import-test', 'config.json'), '[]');
    process.chdir(directory);
    process.env.STORE_TYPE = 'local';
});

afterEach(async () => {
    process.chdir(originalCwd);
    if (originalStoreType === undefined) delete process.env.STORE_TYPE;
    else process.env.STORE_TYPE = originalStoreType;
    if (directory.startsWith(join(tmpdir(), 'blacklist-import-'))) {
        await rm(directory, { recursive: true, force: true });
    }
});

function message(id: string, content: string) {
    return {
        id, content, author: { id: '915952587273023508' },
        delete: mock(async () => {}),
        edit: mock(async (content: string) => ({ id, content })),
    };
}

function fixture(messages: ReturnType<typeof message>[]) {
    const fetch = mock(async (options: string | { limit: number; before?: string }) => {
        if (typeof options === 'string') return messages.find(message => message.id === options);
        const offset = options.before ? messages.findIndex(message => message.id === options.before) + 1 : 0;
        return new Collection(messages.slice(offset, offset + options.limit).map(message => [message.id, message]));
    });
    const send = mock(async () => { throw new Error('Import must not post channel messages'); });
    const channel = { name: 'blacklist', guildId: 'import-test', messages: { fetch }, send };
    const event = {
        guildId: 'import-test', channel, deferred: false, replied: false,
        deferReply: mock(async () => { event.deferred = true; }),
        editReply: mock(async (options: { content: string }) => options),
    };
    return { event: event as unknown as CommandInteraction, fetch, send, editReply: event.editReply };
}

async function saved(name: string) {
    return new Map<string, unknown>(JSON.parse(await readFile(join(directory, 'guilds', 'import-test', `${name}.json`), 'utf8')));
}

test('plain import scans history, saves existing IDs and allows later edits without reposting', async () => {
    const current = message('200', '***--A--***\nAlice');
    const emptySection = message('190', '***--B--***');
    const obsolete = message('100', '***--A--***\nObsolete');
    const chatter = Array.from({ length: 100 }, (_, index) => message(String(500 - index), 'Unrelated conversation'));
    const messages = [...chatter, current, emptySection, obsolete];
    const first = fixture(messages);
    await new BlacklistCommands().init(true, false, false, first.event);

    expect(first.fetch).toHaveBeenCalledTimes(3);
    expect((await saved('Blacklist')).get('A')).toEqual(['***--A--***', 'Alice']);
    expect((await saved('Blacklist')).get('B')).toEqual(['***--B--***']);
    expect((await saved('messages')).get('A')).toMatchObject({ id: '200' });
    expect((await saved('messages')).get('B')).toMatchObject({ id: '190' });
    expect(first.send).not.toHaveBeenCalled();
    for (const entry of messages) {
        expect(entry.delete).not.toHaveBeenCalled();
        expect(entry.edit).not.toHaveBeenCalled();
    }
    expect(first.editReply.mock.calls[0][0].content).toContain('without changing the channel messages');

    // A fresh command instance loads persisted IDs, as it does after a bot restart.
    const next = fixture(messages);
    await new BlacklistCommands().add('Aaron', next.event);
    expect(next.fetch).toHaveBeenCalledWith('200');
    expect(current.edit).toHaveBeenCalledWith('***--A--***\nAaron\nAlice');
    expect(next.send).not.toHaveBeenCalled();
    expect(obsolete.edit).not.toHaveBeenCalled();
    for (const entry of messages) expect(entry.delete).not.toHaveBeenCalled();
});

test('header-only existing list is imported without duplicated header names', async () => {
    const existing = message('100', '***--A--***');
    const run = fixture([existing]);
    await new BlacklistCommands().init(true, false, false, run.event);
    expect((await saved('Blacklist')).get('A')).toEqual(['***--A--***']);
    expect((await saved('messages')).get('A')).toMatchObject({ id: '100' });
    expect(run.send).not.toHaveBeenCalled();
    expect(existing.delete).not.toHaveBeenCalled();
    expect(existing.edit).not.toHaveBeenCalled();
});

test('optional add messages survive when they precede their formatted section in history', async () => {
    const extra = message('200', 'add Aaron');
    const existing = message('100', '***--A--***\nAlice');
    const run = fixture([extra, existing]);
    await new BlacklistCommands().init(true, true, false, run.event);
    expect((await saved('Blacklist')).get('A')).toEqual(['***--A--***', 'Aaron', 'Alice']);
    expect((await saved('messages')).get('A')).toMatchObject({ id: '100' });
    expect(extra.delete).not.toHaveBeenCalled();
    expect(existing.delete).not.toHaveBeenCalled();
    expect(existing.edit).not.toHaveBeenCalled();
    expect(run.send).not.toHaveBeenCalled();
});

test('no matching formatted list leaves saved data and channel messages unchanged', async () => {
    const previous = JSON.stringify([['A', ['***--A--***', 'Saved']]]);
    const previousMessages = JSON.stringify([['A', { id: 'old-saved-id' }]]);
    await writeFile(join(directory, 'guilds', 'import-test', 'Blacklist.json'), previous);
    await writeFile(join(directory, 'guilds', 'import-test', 'messages.json'), previousMessages);
    const unrelated = message('100', '***--not a valid section');
    const run = fixture([unrelated]);
    await new BlacklistCommands().init(true, false, false, run.event);
    expect(await readFile(join(directory, 'guilds', 'import-test', 'Blacklist.json'), 'utf8')).toBe(previous);
    expect(await readFile(join(directory, 'guilds', 'import-test', 'messages.json'), 'utf8')).toBe(previousMessages);
    expect(run.send).not.toHaveBeenCalled();
    expect(unrelated.delete).not.toHaveBeenCalled();
    expect(unrelated.edit).not.toHaveBeenCalled();
});
