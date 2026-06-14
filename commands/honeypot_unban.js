const { removeBan, getAllRegisteredServers, checkAdmin } = require('../database');
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('honeypot_unban')
        .setDescription('Globally unban a user from all registered servers and update their database status.')
        .addStringOption(option =>
            option.setName('user_id')
                .setDescription('The Discord ID of the user you want to unban')
                .setRequired(true)),
                
    async execute(interaction) {
        const userIdBanned = interaction.options.getString('user_id');
        const executorId = interaction.user.id;

        if (!checkAdmin(interaction.user.id)){
            console.log(`[WARNING] Attempted to unban a user by a non-admin user: ${interaction.user.id}`)
            await interaction.reply({
                content: `You do not have administrator permissions`,
                flags: MessageFlags.Ephemeral
            });
            return; 
        }

        const servers = getAllRegisteredServers();
        
        let unbannedCount = 0;
        let failedCount = 0;

        for (const server of servers) {
            try {
                const guild = await interaction.client.guilds.fetch(server.guild_id).catch(() => null);
                if (!guild) continue;

                await guild.bans.remove(userIdBanned, 'Global Unban: Requested via honeypot administration.');
                unbannedCount++;
                console.log(`[UNBAN] ${userIdBanned} in guild: ${guild.id}`);
            } catch (error) {
                failedCount++;
            }
        }

        try {
            removeBan(executorId, userIdBanned);
        } catch (dbError) {
            console.error('[DATABASE ERROR] Failed to update unban status:', dbError);
            return interaction.editReply({
                content: 'Dispatched Discord unbans, but database status update failed. Check console logs.'
            });
        }

        await interaction.editReply({
            content: `Global Unban Process Completed\nUser ID: ${userIdBanned}\nUnbanned successfully from: ${unbannedCount} server(s).\nSkipped/Failed in: ${failedCount} server(s).`
        });
    },
};