import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { ApplicationCommandOptionType, ChatInputCommandInteraction, Client, Collection, Interaction, MessageFlags, PermissionsBitField } from 'discord.js';
import { BlacklistCommands } from '../src/commands/addToList.js';
import { commandDefinitions, dispatchInteraction, registerGuildCommands } from '../src/commands/index.js';

afterEach(() => mock.restore());

function interaction(commandName: string, subcommand?: string, values: Record<string, string | boolean> = {}) {
    return {
        commandName,
        isChatInputCommand: () => true,
        inGuild: () => true,
        options: {
            getSubcommand: () => subcommand,
            getString: (name: string) => values[name] ?? null,
            getBoolean: (name: string) => values[name] ?? null,
        },
        reply: mock(async () => {}),
        user: { tag: 'tester', id: '42' },
        guild: { name: 'Test server', memberCount: 12 },
    } as unknown as ChatInputCommandInteraction;
}

test('command schema preserves names, permissions and option contracts', () => {
    expect(commandDefinitions.map(command => command.name).sort()).toEqual(['blacklist', 'ping', 'server', 'user']);
    const blacklist = commandDefinitions.find(command => command.name === 'blacklist')!;
    expect(blacklist.default_member_permissions).toBe(String(PermissionsBitField.Flags.ManageGuild));
    expect(blacklist.options?.map(option => option.name)).toEqual(['import', 'add', 'remove', 'init', 'print', 'set-prefix']);
    const options = Object.fromEntries(blacklist.options!.map(option => [option.name, 'options' in option ? option.options : []]));
    expect(options.import).toMatchObject([
        { name: 'first-id', type: ApplicationCommandOptionType.String, required: true, max_length: 20 },
        { name: 'last-id', type: ApplicationCommandOptionType.String, required: true, max_length: 20 },
    ]);
    for (const name of ['add', 'remove']) {
        expect(options[name]).toMatchObject([{ name: 'name', type: ApplicationCommandOptionType.String, required: true }]);
    }
    expect(options.init).toMatchObject([
        { name: 'from-old-list', type: ApplicationCommandOptionType.Boolean, required: false },
        { name: 'has-old', type: ApplicationCommandOptionType.Boolean, required: false },
        { name: 'rewrite-list', type: ApplicationCommandOptionType.Boolean, required: false },
    ]);
    // Existing Discord commands use a string for clean, including its truthy-string behavior.
    expect(options.print).toMatchObject([{ name: 'clean', type: ApplicationCommandOptionType.String, required: false }]);
    expect(options['set-prefix']).toMatchObject([{ name: 'prefix', type: ApplicationCommandOptionType.String, required: false }]);
});

test('registration updates each joined guild and never registers global commands', async () => {
    const set = mock(async () => {});
    const fetch = mock(async () => new Collection([['1', { id: '1' }], ['2', { id: '2' }]]));
    const client = { guilds: { fetch }, application: { commands: { set } } } as unknown as Client<true>;
    await registerGuildCommands(client);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(set.mock.calls).toEqual([[commandDefinitions, '1'], [commandDefinitions, '2']]);
});

describe('blacklist routing', () => {
    test.each([
        ['add', 'add', { name: 'Alice' }, ['Alice']],
        ['remove', 'remove', { name: 'Alice' }, ['Alice']],
        ['init', 'init', {}, [false, false, false]],
        ['init', 'init', { 'from-old-list': true, 'has-old': true, 'rewrite-list': true }, [true, true, true]],
        ['print', 'print', {}, [null]],
        ['print', 'print', { clean: 'false' }, ['false']],
        ['set-prefix', 'setPrefix', { prefix: '**' }, ['**']],
        ['set-prefix', 'setPrefix', {}, [null]],
    ] as const)('%s passes options to %s', async (subcommand, method, values, expected) => {
        const handler = spyOn(BlacklistCommands.prototype, method).mockResolvedValue(undefined);
        const event = interaction('blacklist', subcommand, values);
        await dispatchInteraction(event);
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0]).toEqual([...expected, event]);
    });
});

test('utility commands preserve their replies and visibility', async () => {
    const ping = interaction('ping');
    await dispatchInteraction(ping);
    expect(ping.reply).toHaveBeenCalledWith({ content: 'Pong!', flags: MessageFlags.Ephemeral });
    const user = interaction('user');
    await dispatchInteraction(user);
    expect(user.reply).toHaveBeenCalledWith('Your tag: tester\nYour id: 42');
    const server = interaction('server');
    await dispatchInteraction(server);
    expect(server.reply).toHaveBeenCalledWith({ content: 'Server name: Test server\nTotal members: 12' });
});

test('import subcommand routes to the interactive import flow', async () => {
    const event = Object.assign(interaction('blacklist', 'import'), { channel: null });
    await dispatchInteraction(event);
    expect(event.reply).toHaveBeenCalledWith({ content: 'Run this command in your blacklist channel.', flags: MessageFlags.Ephemeral });
});

test('non-command interactions, direct messages and unknown commands do not dispatch', async () => {
    const handler = spyOn(BlacklistCommands.prototype, 'add').mockResolvedValue(undefined);
    await dispatchInteraction({ isChatInputCommand: () => false } as Interaction);
    await dispatchInteraction({ isChatInputCommand: () => true, inGuild: () => false } as Interaction);
    const unknown = interaction('unrecognized');
    await dispatchInteraction(unknown);
    expect(handler).not.toHaveBeenCalled();
    expect(unknown.reply).not.toHaveBeenCalled();
});

test('blacklist commands still acknowledge privately and reject the wrong channel', async () => {
    const event = Object.assign(interaction('blacklist', 'add', { name: 'Alice' }), {
        channel: { name: 'general' },
        deferred: false,
        replied: false,
        deferReply: mock(async () => { event.deferred = true; }),
        editReply: mock(async () => {}),
    });
    await dispatchInteraction(event);
    expect(event.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
    expect(event.editReply).toHaveBeenCalledWith({ content: 'channel is not a blacklist' });
});

test('omitting the optional prefix does not change stored configuration', async () => {
    const event = Object.assign(interaction('blacklist', 'set-prefix'), {
        guildId: '42',
        deferred: false,
        replied: false,
        deferReply: mock(async () => { event.deferred = true; }),
        editReply: mock(async () => {}),
    });
    await dispatchInteraction(event);
    expect(event.editReply).toHaveBeenCalledWith({ content: 'please add a prefix' });
});
