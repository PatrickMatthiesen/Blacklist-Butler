import { ApplicationCommandPermissions, ApplicationCommandPermissionType, CommandInteraction, Guild, PermissionsBitField, Role, ApplicationCommandOptionType } from 'discord.js';
import { Discord, Guard, Slash, SlashOption } from 'discordx';
import { getConfig, getRoleIds, saveConfig } from '../objects/GuildDataHandler.js';
import { client } from '../index.js';
import { PermissionGuard, PermissionsType } from '@discordx/utilities';

export async function CheckPermissions(guild: Guild): Promise<PermissionsType> {
    const roles: ApplicationCommandPermissions[] = [];
    const configRoleIds = getRoleIds(guild.id);

    for (const role of guild.roles.cache.values()) {
        if (role.permissions.has(PermissionsBitField.Flags.Administrator, true) || configRoleIds.includes(role.id))
            roles.push({ id: role.id, type: ApplicationCommandPermissionType.Role, permission: true });
            role.permissions.
    }
    roles.forEach(role => role.id })

    return roles;
}

@Guard(PermissionGuard(["Administrator"]))
@Discord()
abstract class BlacklistButler {

    @Slash({ name: 'add-admin-role', description: 'add a role, to let the role use admin comands' })
    async addAdminRole(
        @SlashOption({ name: 'role', description: 'role to add', type: ApplicationCommandOptionType.Role })
        role: Role,
        interaction: CommandInteraction): Promise<void> {
        if (!interaction.guildId) {
            await interaction.reply({ content: 'something went wrong', ephemeral: true });
            return;
        }

        if (addRoleToconfig(interaction.guildId, role)){
            await interaction.reply({ content: `Gave ${role.toString()} access to admin commands`, ephemeral: true });
            // await client.initApplicationPermissions(true);
        }
        else await interaction.reply({ content: 'something went wrong', ephemeral: true });

    }

    @Slash({ name: 'remove-admin-role', description: 'add a role, to let the role use admin comands' })
    async removeAdminRole(
        @SlashOption({ name: 'role', description: 'role to remove', type: ApplicationCommandOptionType.Role })
        role: Role,
        interaction: CommandInteraction): Promise<void> { // if role is not there say that, otherwise do the do
        if (!interaction.guildId) {
            await interaction.reply({ content: 'something went wrong', ephemeral: true });
            return;
        }
        const isRemoved = removeRoleFromConfig(interaction.guildId, role);
        if (isRemoved) {
            await interaction.reply({ content: `Removed admin command access for ${role.toString()}`, ephemeral: true });
            // await client.initApplicationPermissions(true);
        } else if (isRemoved === null) await interaction.reply({ content: 'The role was never added', ephemeral: true });
        else await interaction.reply({ content: 'something went wrong', ephemeral: true });
    }

    @Slash({ name: 'admin-roles', description: 'Roles that has admin rights to this bot' })
    async adminRoles(
        interaction: CommandInteraction): Promise<void> { // if role is not there say that, otherwise do the do
        if (!interaction.guildId || !interaction.guild) {
            await interaction.reply({ content: 'something went wrong', ephemeral: true });
            return;
        }

        const configRoleIds = getRoleIds(interaction.guildId);

        let adminRoles = '';
        let configRoles = '';

        for (const role of interaction.guild.roles.cache.values()) {
            if (role.permissions.has(PermissionsBitField.Flags.Administrator, true))
                adminRoles += '    ' + role.toString() + '\n';
            else if (configRoleIds.includes(role.id))
                configRoles += '    ' + role.toString() + '\n';
        }

        const msg = 'Admin roles:\n' +
            adminRoles +
            '\n' +
            'Config Roles: \n' +
            configRoles;

        await interaction.reply({ content: msg, ephemeral: true });
    }
}

function addRoleToconfig(guildId: string, role: Role) {
    const config = getConfig(guildId);
    if (!config) {
        return false;
    }
    let newList = null;
    if (config.has('roles')) {
        const roles = config.get('roles');
        if (roles && !roles.includes(role.id) && roles != '')
            newList = roles?.concat(',' + role.id);
    }
    config.set('roles', newList ?? role.id);
    saveConfig(guildId, config);
    return true;
}

function removeRoleFromConfig(guildId: string, role: Role) {
    const config = getConfig(guildId);
    if (!config) {
        return false;
    }
    let newList;
    if (config.has('roles')) {
        const roles = config.get('roles');
        if (roles && roles.includes(role.id)) {
            newList = roles?.split(',');
            const index = newList.indexOf(role.id);
            newList.splice(index, 1);
        } else return null;
    } else return null;
    if (newList) {
        const s = newList.toString();
        config.set('roles', s);
        saveConfig(guildId, config);
    }
    return true;
}