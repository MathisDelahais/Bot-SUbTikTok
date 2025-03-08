const { 
    Client, 
    GatewayIntentBits, 
    PermissionsBitField, 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const ROLE_ID = "1344015772690677922"; 
const CATEGORY_ID = "1347251896015912990"; 
const MOD_ROLE_ID = "1343764290586415145"; 
const SERVEUR_ID = "1343627343121616916";
const ALERT_CHANNEL_ID = "1347267222493466654"; 

client.once('ready', async () => {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);

    const guild = client.guilds.cache.get(SERVEUR_ID);
    if (!guild) return console.error("❌ Serveur introuvable !");


    await guild.commands.set([
        new SlashCommandBuilder()
            .setName("solicitud")  
            .setDescription("Créer une demande avec ton pseudo TikTok")
            .addStringOption(option =>
                option.setName("pseudo")
                    .setDescription("Ton pseudo TikTok")
                    .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName("alerte")
            .setDescription("Crée une alerte à une date spécifique")
            .addStringOption(option => 
                option.setName("date")
                    .setDescription("Date et heure de l'alerte (YYYY-MM-DD)")
                    .setRequired(true)
            )
            .addStringOption(option => 
                option.setName("pseudo_tiktok")
                    .setDescription("Ton pseudo TikTok")
                    .setRequired(true)
            )
            .addStringOption(option => 
                option.setName("pseudo_discord")
                    .setDescription("Ton pseudo Discord")
                    .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName("alertes")
            .setDescription("Affiche les alertes programmées"),
        new SlashCommandBuilder()
            .setName("supprimer-alerte")
            .setDescription("Supprime une alerte")
            .addIntegerOption(option => 
                option.setName("index")
                    .setDescription("Index de l'alerte à supprimer")
                    .setRequired(true)
            )
    ]);

    console.log("✅ Commandes enregistrées !");
});

let alertes = []; 

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {            
        if (interaction.commandName === "alerte") {      
            if (!interaction.member.roles.cache.has(MOD_ROLE_ID)) {
                return interaction.reply({
                    content: "❌ Tu n'as pas l'autorisation d'utiliser cette commande.",
                    ephemeral: true
                });
            }
        
            const dateStr = interaction.options.getString("date");
            const pseudoTiktok = interaction.options.getString("pseudo_tiktok");
            const pseudoDiscord = interaction.options.getString("pseudo_discord");

            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(dateStr)) {
                return interaction.reply({
                    content: "❌ Format invalide. Utilise `YYYY-MM-DD` (ex: `2025-03-06`).",
                    ephemeral: true
                });
            }

            const now = new Date();

            const dateAlerte = new Date(`${dateStr}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`);

            if (isNaN(dateAlerte.getTime())) {
                return interaction.reply({
                    content: "❌ Date invalide. Vérifie le format et la validité de la date.",
                    ephemeral: true
                });
            }

            const timeDiff = dateAlerte - now;

            if (timeDiff <= 0) {
                return interaction.reply({
                    content: "❌ La date est dans le passé. Choisis une date future.",
                    ephemeral: true
                });
            }

            await interaction.reply({
                content: `✅ Alerte programmée pour **${dateAlerte.toLocaleString()}**.`,
                ephemeral: true
            });

            console.log(`🔔 Alerte programmée pour ${dateAlerte.toLocaleString()}`);

            alertes.push({
                date: dateAlerte,
                pseudoDiscord: pseudoDiscord,
                pseudoTiktok: pseudoTiktok
            });

            const checkInterval = setInterval(() => {
                const now = new Date();
                if (now >= dateAlerte) {
                    clearInterval(checkInterval);
                    sendAlert(dateAlerte, pseudoDiscord, pseudoTiktok); 
                }
            }, 60 * 1000); 

        }

        if (interaction.commandName === "alertes") {
            if (alertes.length === 0) {
                return interaction.reply({
                    content: "❌ Il n'y a pas d'alertes programmées.",
                    ephemeral: true
                });
            }

            const alertList = alertes.map((alerte, index) => 
                `**Alerte #${index + 1}:** ${alerte.date.toLocaleString()} | **Pseudo Discord:** ${alerte.pseudoDiscord} | **Pseudo TikTok:** ${alerte.pseudoTiktok}`
            ).join("\n");

            return interaction.reply({
                content: `Voici les alertes programmées :\n\n${alertList}`,
                ephemeral: true
            });
        }

        if (interaction.commandName === "supprimer-alerte") {
            const index = interaction.options.getInteger("index") - 1;

            if (index < 0 || index >= alertes.length) {
                return interaction.reply({
                    content: "❌ Index invalide. Aucune alerte trouvée à cet index.",
                    ephemeral: true
                });
            }

            const deletedAlert = alertes.splice(index, 1);

            await interaction.reply({
                content: `✅ Alerte supprimée : **${deletedAlert[0].date.toLocaleString()}**`,
                ephemeral: true
            });

            console.log(`❌ Alerte supprimée : ${deletedAlert[0].date.toLocaleString()}`);
        }

        if (interaction.commandName === "solicitud") {
            const pseudoTiktok = interaction.options.getString("pseudo");
            const guild = interaction.guild;
            const member = interaction.member;
    
            const channel = await guild.channels.create({
                name: `demande-${member.user.username}`,
                type: 0,
                parent: CATEGORY_ID,
                topic: member.id, 
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, 
                    { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }, 
                    { id: MOD_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] } 
                ]
            });
    
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('validate')
                        .setLabel('✅ Valider')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('close')
                        .setLabel('❌ Fermer')
                        .setStyle(ButtonStyle.Danger)
                );
    
            await channel.send({
                content: `👋 **Nouvelle demande de vérification !**\n👤 **Pseudo TikTok:** ${pseudoTiktok}\n📌 **Membre:** ${member}`,
                components: [row]
            });
    
            await interaction.reply({ content: `✅ Salon créé : ${channel}`, ephemeral: true });
        }
    }

    if (interaction.isButton()) {
        await interaction.deferReply({ ephemeral: true });

        const memberId = interaction.channel.topic;
        if (!memberId) return interaction.editReply({ content: "❌ Erreur : impossible de retrouver le membre.", ephemeral: true });

        const member = await interaction.guild.members.fetch(memberId).catch(() => null);
        if (!member) return interaction.editReply({ content: "❌ Le membre n'existe plus sur le serveur.", ephemeral: true });

        if (!interaction.member.roles.cache.has(MOD_ROLE_ID)) {
            return interaction.editReply({ content: "❌ Tu n'as pas l'autorisation d'utiliser ce bouton.", ephemeral: true });
        }

        if (interaction.customId === 'validate') {
            await member.roles.add(ROLE_ID).catch(console.error);
            await interaction.editReply({ content: `✅ **Rôle ajouté à ${member.user.tag}**`, ephemeral: true });
        } else if (interaction.customId === 'close') {
            await interaction.editReply({ content: "🔒 Salon fermé.", ephemeral: true });
            setTimeout(() => interaction.channel.delete(), 2000);
        }
    }
});

function sendAlert(dateAlerte, pseudoDiscord, pseudoTiktok) {
    const alertChannel = client.channels.cache.get(ALERT_CHANNEL_ID);
    if (!alertChannel) return console.error("❌ Salon d'alerte introuvable !");

    alertChannel.send(`🔔 **Alerte !**\n🗓️ **Date:** ${dateAlerte.toLocaleString()}\n👤 **Pseudo Discord:** ${pseudoDiscord}\n🎥 **Pseudo TikTok:** ${pseudoTiktok}`);
}

client.login(process.env.TOKEN);



