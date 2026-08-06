const { checkAdmin, checkHoneypotChannel, updateHoneypotAction } = require('../database');
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('honeypot_action')
        .setDescription('Set whether the honeypot bans or kicks caught users (default: kick).')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('What happens to users who trigger the honeypot.')
                .addChoices(
                    { name: 'kick', value: 'kick' },
                    { name: 'ban', value: 'ban' }
                )),

    async execute(interaction) {
        if (!checkAdmin(interaction.user.id)) {
            console.log(`[WARNING] Attempted to change honeypot action by a non-admin user: ${interaction.user.id}`);
            await interaction.reply({
                content: 'You do not have administrator permissions',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const honeypot = checkHoneypotChannel.get(interaction.guildId);
        if (!honeypot) {
            await interaction.reply({
                content: 'No honeypot is configured for this server. Set one with /honeypot_create first.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const action = interaction.options.getString('action');
        if (!action) {
            await interaction.reply({
                content: `Current honeypot action for this server: **${honeypot.action || 'kick'}**.`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        updateHoneypotAction(interaction.guildId, action);
        await interaction.reply({
            content: `Honeypot action set to **${action}**.`,
            flags: MessageFlags.Ephemeral
        });
    },
};
