import type { Message, TextBasedChannel } from 'discord.js';

const MAX_RANGE_MESSAGES = 1_000;
const MAX_SNOWFLAKE = (1n << 64n) - 1n;

export type ImportPreview = {
    prefix: string;
    sections: Map<string, string[]>;
    messages: Map<string, Message>;
    entryCount: number;
};

/** Read a bounded range of existing blacklist messages without changing Discord state. */
export async function readImportRange(
    channel: TextBasedChannel,
    firstId: string,
    lastId: string,
    botUserId: string,
): Promise<ImportPreview> {
    const first = parseSnowflake(firstId);
    const last = parseSnowflake(lastId);
    const lowerId = first.value <= last.value ? first.id : last.id;
    const upperId = first.value >= last.value ? first.id : last.id;
    const lowerValue = first.value <= last.value ? first.value : last.value;
    const upperMessage = await fetchEndpoint(channel, upperId);
    const lowerMessage = lowerId === upperId ? upperMessage : await fetchEndpoint(channel, lowerId);

    const upperHeader = parseHeader(upperMessage.content.split(/\r?\n/, 1)[0] ?? '');
    const lowerHeader = parseHeader(lowerMessage.content.split(/\r?\n/, 1)[0] ?? '');
    if (!upperHeader || !lowerHeader) {
        throw new Error('Both selected messages must be blacklist section headers, such as **--A--**.');
    }
    if (upperHeader.prefix !== lowerHeader.prefix) {
        throw new Error('The selected messages use different blacklist header prefixes.');
    }

    const candidates = new Map<string, Message>();
    candidates.set(upperMessage.id, upperMessage);
    candidates.set(lowerMessage.id, lowerMessage);

    if (lowerValue < BigInt(upperId)) {
        let before = upperId;
        let reachedLower = false;
        while (!reachedLower) {
            let page;
            try {
                page = await channel.messages.fetch({ limit: 100, before, cache: false });
            } catch {
                throw new Error('Discord could not read the messages between those IDs. Check the IDs and try again.');
            }
            if (page.size === 0) {
                throw new Error('Discord could not read the complete selected range. Check that both IDs are in this channel.');
            }

            const pageMessages = [...page.values()].sort((a, b) => compareSnowflakes(b.id, a.id));
            let oldestId: string | undefined;
            for (const message of pageMessages) {
                oldestId = message.id;
                const value = BigInt(message.id);
                if (value <= lowerValue) reachedLower = true;
                if (value >= lowerValue && value <= BigInt(upperId)) candidates.set(message.id, message);
            }

            if (candidates.size > MAX_RANGE_MESSAGES) {
                throw new Error(`That range contains more than ${MAX_RANGE_MESSAGES} messages. Choose a smaller range.`);
            }
            if (reachedLower) break;
            if (!oldestId || oldestId === before) {
                throw new Error('Discord could not read the complete selected range. Check that both IDs are in this channel.');
            }
            before = oldestId;
        }
    }

    if (!candidates.has(lowerId) || !candidates.has(upperId)) {
        throw new Error('Discord could not read both endpoint messages in the selected range.');
    }
    if (candidates.size > MAX_RANGE_MESSAGES) {
        throw new Error(`That range contains more than ${MAX_RANGE_MESSAGES} messages. Choose a smaller range.`);
    }

    const sections = new Map<string, string[]>();
    const messages = new Map<string, Message>();
    const sortedMessages = [...candidates.values()].sort((a, b) => compareSnowflakes(a.id, b.id));
    for (const message of sortedMessages) {
        const lines = message.content.split(/\r?\n/);
        const header = parseHeader(lines[0] ?? '');
        if (!header) continue;
        if (header.prefix !== upperHeader.prefix) {
            throw new Error('The selected range contains blacklist sections with different header prefixes.');
        }
        if (message.author.id !== botUserId) {
            throw new Error('Every blacklist section in the selected range must be authored by this bot so it can update the list later.');
        }
        if (sections.has(header.letter)) {
            throw new Error(`The selected range contains more than one ${header.letter} section. Choose endpoints that include each section only once.`);
        }

        const sectionLines = [lines[0]!, ...lines.slice(1).filter(line => line.trim().length > 0)];
        sections.set(header.letter, sectionLines);
        messages.set(header.letter, message);
    }

    const entryCount = [...sections.values()].reduce((total, lines) => total + lines.length - 1, 0);
    return { prefix: upperHeader.prefix, sections, messages, entryCount };
}

function parseSnowflake(input: string): { id: string; value: bigint } {
    const trimmed = input.trim();
    if (!/^\d+$/.test(trimmed)) throw new Error('Message IDs must contain decimal digits only.');
    const value = BigInt(trimmed);
    if (value <= 0n || value > MAX_SNOWFLAKE) {
        throw new Error('Message IDs must be valid unsigned 64-bit Discord IDs.');
    }
    return { id: value.toString(), value };
}

async function fetchEndpoint(channel: TextBasedChannel, id: string): Promise<Message> {
    try {
        const message = await channel.messages.fetch({ message: id, cache: false, force: true });
        if (message.id !== id) throw new Error('Fetched message ID did not match the requested ID.');
        if (message.content.trim().length === 0) throw new Error('Message has no content.');
        return message;
    } catch (error) {
        if (error instanceof Error && error.message === 'Message has no content.') throw error;
        throw new Error(`Could not read endpoint message ${id}. Check that the ID exists in this channel.`, { cause: error });
    }
}

function parseHeader(line: string): { prefix: string; letter: string } | undefined {
    for (let index = 1; index < line.length - 1; index++) {
        const letter = line[index]!;
        if (!/^[A-Z]$/.test(letter)) continue;
        const prefix = line.slice(0, index);
        const suffix = line.slice(index + 1);
        if (!/^[\p{P}\p{S}]+$/u.test(prefix)) continue;
        if (suffix !== [...prefix].reverse().join('')) continue;
        return { prefix, letter };
    }
    return undefined;
}

function compareSnowflakes(left: string, right: string): number {
    const a = BigInt(left);
    const b = BigInt(right);
    return a < b ? -1 : a > b ? 1 : 0;
}
