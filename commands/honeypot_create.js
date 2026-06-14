const { addHoneypot } = require('../database');
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder().setName('honeypot_create').setDescription('Set a channel for honeypot.').addChannelOption(option =>
        option.setName('channel')
            .setDescription('The channel to set as the honeypot')
            .setRequired(true)),
	async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        if (!channel) {
            await interaction.reply({ content: 'Please specify a valid channel.', flags: MessageFlags.Ephemeral });
            return;
        }
        // Save the honeypot channel ID to the database
        const guildId = interaction.guildId;
        const channelId = channel.id;
        try {
            const success = addHoneypot(guildId, channelId, interaction.user.id);
            if (success) {
                await interaction.reply({ content: `Honeypot channel has been set to ${channel.name}.`, flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: 'You do not have permission to set the honeypot channel.', flags: MessageFlags.Ephemeral });
            }
        } catch (error) {
            console.error('Error setting honeypot channel:', error);
            await interaction.reply({ content: 'There was an error setting the honeypot channel. Please try again later.', flags: MessageFlags.Ephemeral });
        }
	},
};

