const { updateHoneypotMessage, checkHoneypotChannelWithGuildId, checkAdmin } = require('../database');
const { SlashCommandBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

async function handleDiscordHoneypotMessage(client, guildId, messageContent) {
    const honeypotChannelData = checkHoneypotChannelWithGuildId(guildId);
    
    if (!honeypotChannelData) {
        console.log(`[ERROR] No honeypot channel found for guild ${guildId}.`);
        return { success: false };
    }
    
    const { channel_id: channelId, message_id: oldMessageId } = honeypotChannelData;
    
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return { success: false };

    let payload;
    try {
        const parsed = JSON.parse(messageContent); 
        
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            payload = parsed;
        } else {
            payload = { content: messageContent };
        }
    } catch(err) {
        payload = { content: messageContent };
    }
    
    if (oldMessageId) {
        try {
            const existingMessage = await channel.messages.fetch(oldMessageId);
            if (existingMessage) {
                await existingMessage.edit(payload); 
                return { success: true, messageId: oldMessageId }; 
            }
        } catch (err) {
            console.log(`[INFO] ${oldMessageId} Deleted?.`);
        }
    }
    
    try { 
        const newMessage = await channel.send(payload);
        return { success: true, messageId: newMessage.id };
    } catch (err) {
        console.error(`Failed to send new message to honeypot channel ${channelId}:`, err);
        return { success: false };
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('honeypot_message')
        .setDescription('Update the message for the honeypot.'),
        
    async execute(interaction) {

        if (!checkAdmin(interaction.user.id)){
            console.log(`[WARNING] Attempted to create a honeypot message by a non-admin user: ${interaction.user.id}`)
            await interaction.reply({
                content: `You do not have administrator permissions`,
                flags: MessageFlags.Ephemeral
            });
            return; 
        }

        const modal = new ModalBuilder()
            .setCustomId('honeypotMessageModal')
            .setTitle('Honeypot Message Setup');
        
        const messageInput = new TextInputBuilder()
            .setCustomId('honeypotMessageInput')
            .setLabel('Enter the honeypot message content')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(`{"content": "Message", "embeds": []}`)
            .setRequired(true)
            .setMaxLength(2000);

        modal.addComponents(new ActionRowBuilder().addComponents(messageInput));

        await interaction.showModal(modal);

        try {
            const modalSubmit = await interaction.awaitModalSubmit({
                filter: (i) => i.customId === 'honeypotMessageModal' && i.user.id === interaction.user.id,
                time: 300000 
            });

            const messageContent = modalSubmit.fields.getTextInputValue('honeypotMessageInput');
            const guildId = modalSubmit.guildId;
            const userId = modalSubmit.user.id;

            const discordResult = await handleDiscordHoneypotMessage(modalSubmit.client, guildId, messageContent);
            
            if (discordResult.success) {
                const dbSuccess = updateHoneypotMessage(guildId, messageContent, discordResult.messageId, userId);
                
                if (dbSuccess) {
                    await modalSubmit.reply({ content: 'Honeypot message has been correctly updated/sent and saved.', flags: MessageFlags.Ephemeral });
                } else {
                    await modalSubmit.reply({ content: 'Message updated on Discord, but database failed (Permission issue?).', flags: MessageFlags.Ephemeral });
                }
            } else {
                await modalSubmit.reply({ content: 'Failed to access channel or send the message on Discord.', flags: MessageFlags.Ephemeral });
            }

        } catch (error) {
            if (error.code !== 'InteractionCollectorError') {
                 console.error('Error handling modal:', error);
                 if (interaction.isRepliable()) {
                     await interaction.followUp({ content: 'There was an error updating the message.', flags: MessageFlags.Ephemeral });
                 }
            }
        }
    },
};