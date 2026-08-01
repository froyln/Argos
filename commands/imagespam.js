const { checkAdmin, getImageSpamSettings, setImageSpamSettings } = require('../database');
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('imagespam')
        .setDescription('Configure the image spam protection for this server.')
        .addBooleanOption(option =>
            option.setName('enabled')
                .setDescription('Enable or disable image spam protection.'))
        .addBooleanOption(option =>
            option.setName('announce')
                .setDescription('Send the notification message when protection triggers.')),

    async execute(interaction) {
        if (!checkAdmin(interaction.user.id)) {
            console.log(`[WARNING] Attempted to configure image spam by a non-admin user: ${interaction.user.id}`);
            await interaction.reply({
                content: 'You do not have administrator permissions',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const enabled = interaction.options.getBoolean('enabled');
        const announce = interaction.options.getBoolean('announce');
        const current = getImageSpamSettings(interaction.guildId);

        if (enabled === null && announce === null) {
            await interaction.reply({
                content: `Current settings for this server:\nImage spam protection: ${current.enabled ? 'ON' : 'OFF'}\nNotification message: ${current.announce ? 'ON' : 'OFF'}`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        setImageSpamSettings(interaction.guildId, enabled ?? current.enabled, announce ?? current.announce);
        const updated = getImageSpamSettings(interaction.guildId);

        await interaction.reply({
            content: `Settings updated.\nImage spam protection: ${updated.enabled ? 'ON' : 'OFF'}\nNotification message: ${updated.announce ? 'ON' : 'OFF'}`,
            flags: MessageFlags.Ephemeral
        });
    },
};
