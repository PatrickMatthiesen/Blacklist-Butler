import { ApplicationCommandPermissions, CommandInteraction, Guild, Role } from 'discord.js';
import { Discord, Permission, Slash, SlashOption } from 'discordx';
import { getConfig, getRoleIds, saveConfig } from '../objects/GuildDataHandler.js';

export async function CheckPermissions(guild: Guild): Promise<ApplicationCommandPermissions[]> {
    const roles: ApplicationCommandPermissions[] = [];
    const configRoleIds = getRoleIds(guild.id);

    for (const role of guild.roles.cache.values()) {
        if (role.permissions.has('ADMINISTRATOR', true) || configRoleIds.includes(role.id))
            roles.push({ id: role.id, type: 'ROLE', permission: true });
    }
    return roles;
}

@Permission(false)
@Permission(guild => CheckPermissions(guild))
@Discord()
abstract class BlacklistButler {
    // @Slash("permissiontest", { description: 'can use if you have admin' })
    // async testPermission(
    //     interaction: CommandInteraction): Promise<void> {
    //     await interaction.reply({ content: 'you can do it', ephemeral: true });
    // }

    @Slash("add-admin-role", { description: 'add a role, to let the role use admin comands' })
    async addAdminRole(
        @SlashOption('role', { description: 'role to add' })
        role: Role,
        interaction: CommandInteraction): Promise<void> {
        if (!interaction.guildId) {
            await interaction.reply({ content: 'something went wrong', ephemeral: true });
            return;
        }


        if (addRoleToconfig(interaction.guildId, role))
            await interaction.reply({ content: `Gave ${role.toString()} access to admin commands`, ephemeral: true });
        else await interaction.reply({ content: 'something went wrong', ephemeral: true });

        interaction.command?.permissions.add({ guild: interaction.guildId, permissions: [{ id: role.id, type: 'ROLE', permission: true }] });
    }

    @Slash("remove-admin-role", { description: 'add a role, to let the role use admin comands' })
    async removeAdminRole(
        @SlashOption('role', { description: 'role to remove' })
        role: Role,
        interaction: CommandInteraction): Promise<void> { // if role is not there say that, otherwise do the do
        if (!interaction.guildId) {
            await interaction.reply({ content: 'something went wrong', ephemeral: true });
            return;
        }
        const isRemoved = removeRoleFromConfig(interaction.guildId, role);
        if (isRemoved) {
            await interaction.reply({ content: `Removed admin command access for ${role.toString()}`, ephemeral: true });
        } else if (isRemoved === null) await interaction.reply({ content: 'The role was never added', ephemeral: true });
        await interaction.reply({ content: 'something went wrong', ephemeral: true });

        interaction.command?.permissions.remove({ guild: interaction.guildId, roles: role.id });
    }

    @Slash("admin-roles", { description: 'Roles that has admin rights to this bot' })
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
            if (role.permissions.has('ADMINISTRATOR', true))
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
    let newList;
    if (config.has('roles')) {
        const roles = config.get('roles');
        if (roles && !roles.includes(role.id))
            newList = roles?.concat(',' + role.id);
        else return true;
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