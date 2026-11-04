import { expect, mock, test } from 'bun:test';
import { Collection, type Message, type TextBasedChannel } from 'discord.js';
import { readImportRange } from '../src/commands/import-list-data.js';

type FixtureMessage = {
    id: string;
    content: string;
    author: { id: string };
    edit: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
};

function makeMessage(id: string, content: string, authorId = 'bot'): FixtureMessage {
    return {
        id,
        content,
        author: { id: authorId },
        edit: mock(async () => {}),
        delete: mock(async () => {}),
    };
}

function makeChannel(items: FixtureMessage[]) {
    const byId = new Map(items.map(message => [message.id, message]));
    const fetch = mock(async (input: string | { message: string; cache?: boolean } | { limit: number; before?: string; cache?: boolean }) => {
        if (typeof input === 'string') return byId.get(input) as unknown as Message;
        if ('message' in input) return byId.get(input.message) as unknown as Message;
        const before = input.before ? BigInt(input.before) : undefined;
        const page = items
            .filter(message => before === undefined || BigInt(message.id) < before)
            .sort((a, b) => BigInt(a.id) > BigInt(b.id) ? -1 : 1)
            .slice(0, input.limit);
        return new Collection(page.map(message => [message.id, message as unknown as Message]));
    });
    const send = mock(async () => { throw new Error('Range preview must not send messages'); });
    const channel = { id: 'channel', messages: { fetch }, send } as unknown as TextBasedChannel;
    return { channel, fetch, send, items };
}

test('imports the selected A section and preserves each nonblank name line', async () => {
    const a = makeMessage('200', '**--A--**\na_fixture_one\nA-Test-Two\nAlpha-user03\nALL_CAPS_04\nAlphaNumber24\nalpha_lowercase\nAnotherFixture\nAlphaFixture66\nAnExampleID\nAnotherTestName\nalpha-020 - 2nd life\nAlpha-X17\nAlpha_Viper\nAlpha_J\nalpha\nAlphaLast');
    const b = makeMessage('100', '**--B--**\nBee');
    const run = makeChannel([a, b]);

    const preview = await readImportRange(run.channel, '100', '200', 'bot');

    expect(preview.prefix).toBe('**--');
    expect(preview.sections.get('A')).toEqual([
        '**--A--**', 'a_fixture_one', 'A-Test-Two', 'Alpha-user03', 'ALL_CAPS_04',
        'AlphaNumber24', 'alpha_lowercase', 'AnotherFixture', 'AlphaFixture66', 'AnExampleID',
        'AnotherTestName', 'alpha-020 - 2nd life', 'Alpha-X17', 'Alpha_Viper',
        'Alpha_J', 'alpha', 'AlphaLast',
    ]);
    expect(preview.messages.get('A')).toBe(a as unknown as Message);
    expect(preview.entryCount).toBe(17);
    expect(run.fetch).toHaveBeenCalledWith({ message: '100', cache: false, force: true });
    expect(run.fetch).toHaveBeenCalledWith({ message: '200', cache: false, force: true });
    expect(run.send).not.toHaveBeenCalled();
    expect(a.edit).not.toHaveBeenCalled();
    expect(a.delete).not.toHaveBeenCalled();
});

test('uses BigInt for uint64 IDs and accepts reversed endpoints', async () => {
    const top = makeMessage('18446744073709551615', '##B##\nBee');
    const bottom = makeMessage('18446744073709551614', '##A##\nAlice');
    const run = makeChannel([top, bottom]);

    const preview = await readImportRange(run.channel, top.id, bottom.id, 'bot');

    expect(preview.prefix).toBe('##');
    expect([...preview.sections.keys()]).toEqual(['A', 'B']);
    expect(preview.entryCount).toBe(2);
});

test('paginates beyond 100 messages, includes endpoints, and ignores messages outside the range', async () => {
    const top = makeMessage('300', '**--A--**\nAlice');
    const lower = makeMessage('50', '**--B--**\nBob');
    const outsideHigh = makeMessage('400', '**--Z--**\nOutside high');
    const outsideLow = makeMessage('1', '**--Y--**\nOutside low');
    const chatter = Array.from({ length: 150 }, (_, index) => makeMessage(String(299 - index), 'unrelated chatter'));
    const run = makeChannel([outsideHigh, top, ...chatter, lower, outsideLow]);

    const preview = await readImportRange(run.channel, lower.id, top.id, 'bot');

    expect(run.fetch.mock.calls.filter(([input]) => typeof input === 'object' && 'limit' in input)).toHaveLength(2);
    expect(preview.sections.size).toBe(2);
    expect(preview.sections.has('Z')).toBe(false);
    expect(preview.sections.has('Y')).toBe(false);
    expect(preview.entryCount).toBe(2);
});

test('rejects invalid IDs, malformed endpoints, prefix mismatches, duplicate sections, and non-bot sections', async () => {
    const a = makeMessage('200', '**--A--**\nAlice');
    const b = makeMessage('100', '**--B--**\nBob');
    const base = makeChannel([a, b]);
    await expect(readImportRange(base.channel, '1.2', '200', 'bot')).rejects.toThrow('decimal digits');
    await expect(readImportRange(base.channel, '18446744073709551616', '200', 'bot')).rejects.toThrow('unsigned 64-bit');

    const malformed = makeChannel([makeMessage('200', 'not a section'), b]);
    await expect(readImportRange(malformed.channel, '100', '200', 'bot')).rejects.toThrow('Both selected messages');

    const differentPrefix = makeChannel([makeMessage('200', '**--A--**\nAlice'), makeMessage('100', '##B##\nBob')]);
    await expect(readImportRange(differentPrefix.channel, '100', '200', 'bot')).rejects.toThrow('different blacklist header prefixes');

    const duplicate = makeChannel([
        makeMessage('300', '**--A--**\nAlice'),
        makeMessage('200', '**--A--**\nAnother Alice'),
        makeMessage('100', '**--B--**\nBob'),
    ]);
    await expect(readImportRange(duplicate.channel, '100', '300', 'bot')).rejects.toThrow('more than one A section');

    const wrongAuthor = makeChannel([
        makeMessage('300', '**--A--**\nAlice'),
        makeMessage('200', '**--C--**\nCarol', 'someone-else'),
        makeMessage('100', '**--B--**\nBob'),
    ]);
    await expect(readImportRange(wrongAuthor.channel, '100', '300', 'bot')).rejects.toThrow('authored by this bot');
});

test('rejects ranges that cannot be fully paginated', async () => {
    const upper = makeMessage('200', '**--A--**\nAlice');
    const lower = makeMessage('100', '**--B--**\nBob');
    const fetch = mock(async (input: string | { message: string; cache?: boolean } | { limit: number; before?: string; cache?: boolean }) => {
        if (typeof input === 'object' && 'message' in input) return (input.message === upper.id ? upper : lower) as unknown as Message;
        return new Collection();
    });
    const channel = { messages: { fetch } } as unknown as TextBasedChannel;

    await expect(readImportRange(channel, lower.id, upper.id, 'bot')).rejects.toThrow('complete selected range');
});

test('refuses oversized ranges instead of silently importing a partial list', async () => {
    const upper = makeMessage('2000', '**--A--**\nAlice');
    const lower = makeMessage('1', '**--B--**\nBob');
    const chatter = Array.from({ length: 1_001 }, (_, index) => makeMessage(String(1999 - index), 'chat'));
    const run = makeChannel([upper, ...chatter, lower]);
    await expect(readImportRange(run.channel, lower.id, upper.id, 'bot')).rejects.toThrow('more than 1000 messages');
    expect(run.send).not.toHaveBeenCalled();
});
