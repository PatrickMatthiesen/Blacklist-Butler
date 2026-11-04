import { Client, Interaction, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { BlacklistCommands } from './addToList.js';
import { ping } from './ping.js';
import { server } from './server.js';
import { user } from './user.js';
import { importList } from './import-list.js';

export const commandDefinitions = [
    new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
    new SlashCommandBuilder().setName('server').setDescription('Replies with server info!'),
    new SlashCommandBuilder().setName('user').setDescription('Replies with user info!'),
    new SlashCommandBuilder()
        .setName('blacklist').setDescription('Manage Blacklist')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .addSubcommand(command => command.setName('import').setDescription('Import existing list messages by ID and detect their prefix')
            .addStringOption(option => option.setName('first-id').setDescription('Message ID of the first list section').setRequired(true).setMaxLength(20))
            .addStringOption(option => option.setName('last-id').setDescription('Message ID of the last list section').setRequired(true).setMaxLength(20)))
        .addSubcommand(command => command.setName('add').setDescription('Adds the users to the blacklist')
            .addStringOption(option => option.setName('name').setDescription('name of person').setRequired(true)))
        .addSubcommand(command => command.setName('remove').setDescription('Removes a user from the blacklist')
            .addStringOption(option => option.setName('name').setDescription('name to remove').setRequired(true)))
        .addSubcommand(command => command.setName('init').setDescription('Adds the users to the blacklist')
            .addBooleanOption(option => option.setName('from-old-list').setDescription('use this option if you have an old list to init from'))
            .addBooleanOption(option => option.setName('has-old').setDescription('(require "from-old-list = true") if messages like "add `name`" should be added to the list'))
            .addBooleanOption(option => option.setName('rewrite-list').setDescription('require from-old-list; rewrite the blacklist messages in this channel')))
        .addSubcommand(command => command.setName('print').setDescription('Prints the blacklist to the channel')
            .addStringOption(option => option.setName('clean').setDescription('delete all other messages before printing the list')))
        .addSubcommand(command => command.setName('set-prefix').setDescription('set the prefix that formats the headers in the blacklist')
            .addStringOption(option => option.setName('prefix').setDescription('a prefix like "--" for a header "--A--" or "***" for a bold and italics header'))),
].map(command => command.toJSON());

export async function registerGuildCommands(client: Client<true>) {
    const guilds = await client.guilds.fetch();
    for (const guild of guilds.values()) {
        await client.application.commands.set(commandDefinitions, guild.id);
    }
}

const blacklist = new BlacklistCommands();

export async function dispatchInteraction(interaction: Interaction) {
    if (!interaction.isChatInputCommand() || !interaction.inGuild()) return;

    switch (interaction.commandName) {
        case 'ping': return ping(interaction);
        case 'server': return server(interaction);
        case 'user': return user(interaction);
        case 'blacklist':
            switch (interaction.options.getSubcommand()) {
                case 'import': return importList(interaction);
                case 'add': return blacklist.add(interaction.options.getString('name', true), interaction);
                case 'remove': return blacklist.remove(interaction.options.getString('name', true), interaction);
                case 'init': return blacklist.init(
                    interaction.options.getBoolean('from-old-list') ?? false,
                    interaction.options.getBoolean('has-old') ?? false,
                    interaction.options.getBoolean('rewrite-list') ?? false,
                    interaction);
                case 'print': return blacklist.print(interaction.options.getString('clean'), interaction);
                case 'set-prefix': return blacklist.setPrefix(interaction.options.getString('prefix'), interaction);
            }
    }
}
