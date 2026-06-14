const { removeHoneypot, checkAdmin } = require('../database');
const { SlashCommandBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('honeypot_delete')
        .setDescription('Remove the honeypot configuration for this server.'),
        
    async execute(interaction) {
        if (!checkAdmin(interaction.user.id)) {
            console.log(`[WARNING] Attempted to delete a honeypot by a non-admin user: ${interaction.user.id}`);
            await interaction.reply({
                content: 'You do not have administrator permissions',
                flags: MessageFlags.Ephemeral
            });
            return; 
        }

        const modal = new ModalBuilder()
            .setCustomId('honeypotDeleteModal')
            .setTitle('Delete Honeypot');
        
        const confirmationInput = new TextInputBuilder()
            .setCustomId('confirmationInput')
            .setLabel("Are you sure? (Type 'yes' to confirm)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('yes')
            .setRequired(true)
            .setMaxLength(3);

        const actionRow = new ActionRowBuilder().addComponents(confirmationInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);

        try {
            const modalSubmit = await interaction.awaitModalSubmit({
                filter: (i) => i.customId === 'honeypotDeleteModal' && i.user.id === interaction.user.id,
                time: 60000
            });

            const userInput = modalSubmit.fields.getTextInputValue('confirmationInput').toLowerCase().trim();
            const guildId = modalSubmit.guildId;
            const userId = modalSubmit.user.id;

            if (userInput !== 'yes') {
                await modalSubmit.reply({ 
                    content: 'Operation cancelled. You did not type "yes".', 
                    flags: MessageFlags.Ephemeral 
                });
                return;
            }

            const dbSuccess = removeHoneypot(guildId, userId);
            
            if (dbSuccess) {
                await modalSubmit.reply({ 
                    content: 'The honeypot configuration for this server has been completely removed.', 
                    flags: MessageFlags.Ephemeral 
                });
            } else {
                await modalSubmit.reply({ 
                    content: 'Failed to remove the honeypot. Ensure it is currently set up and that you have Admin privileges in the database.', 
                    flags: MessageFlags.Ephemeral 
                });
            }

        } catch (error) {
            if (error.code !== 'InteractionCollectorError') {
                 console.error('Error handling delete modal:', error);
                 if (interaction.isRepliable()) {
                     await interaction.followUp({ 
                         content: 'There was an error trying to process the deletion.', 
                         flags: MessageFlags.Ephemeral 
                     });
                 }
            }
        }
    },
};