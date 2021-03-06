const Discord = require('discord.js');
const db = require('quick.db');
const token = require('./general/token.json');
const config = require('./general/config.json');
const client = new Discord.Client();
var main = db.get('main') || [];
var id = db.get('id') || 0;

function dm(targetId = String, description = String, color = String) {
  const ch = client.users.cache.get(targetId);
  var embed = new Discord.MessageEmbed().setDescription(description).setColor(color);
  try {
    ch.send(embed);
  } catch (err) {
    console.warn(err)
  }
};

function reply(id, token, cont) {
  client.api.interactions(id, token).callback.post({data: {
    type: 4,
    data: {
      content: cont,
      flags: 1 << 6,
    }
  }});
};

async function vent(member, chId, iId, iToken, vent) {
  const ventCh = client.channels.cache.get(chId);
  try {
    ventCh.fetchWebhooks().then(async hooks => {
      if (hooks == null) return reply(iId, iToken, 'Error:\nNo webhooks found!');
      const webhook = hooks.get('868561540675166238');

      main.push([++id, `${member.user.username}#${member.user.discriminator}`, member.user.id]);
      var embeds = [];
      embeds.push(new Discord.MessageEmbed().setDescription(vent).setColor('#4995a3').setFooter(`Id: ${id}`));
      webhook.send(`[Venting] Id: ${id}`, {
        username: 'Anonymous Venter',
        avatarURL: client.user.displayAvatarURL(),
        embeds: embeds,
      });
      reply(iId, iToken, `Your message has been sent to the venting channel. Please know we are all here for you <3\n*Keep in mind you can always delete a message you sent by doing /delete followed by the id of your vent.*`);
      db.set('main', main);
      db.set('id', id);
      client.channels.cache.get(config['log-ch']).send(`${id}: ||${member.user.username}#${member.user.discriminator}(${member.user.id})||`);
      console.log(id);
    });
  } catch (error) {
    console.warn(error);
  }
};

async function deleteVent(iId, iToken, id) {
  try {
    var yes = true;
    const messages = await client.channels.cache.get(config['vent-ch']).messages.fetch({ limit: 20 })
    messages.forEach(async (msg) => {
      var ventId = msg.content.split(' ');
      if (msg.webhookID != null && ventId[2] == id && yes) {
        const message = await client.channels.cache.get(config['vent-ch']).messages.fetch(msg.id)
        message.delete();
        client.channels.cache.get(config['log-ch']).send(`Deleted vent id ${id}`)
        !yes;
      } 
    });
    reply(iId, iToken, `The vent was deleted\nIf you believe this is an actually an error contact a mod with a screenshot`);
  } catch (err) {
    console.warn(err);
  }
}

client.once('ready', () => {
  client.user.setActivity('/vent');
  console.log(`Logged in as ${client.user.tag}`);
  client.api.applications(client.user.id).guilds('821929481681502238').commands.post({data: {
    name: 'vent',
    description: 'Sends an anonymous vent the venting channel',
    options: [
      {
        name: 'vent',
        type: 3,
        description: 'The vent that will be sent into the channel',
        required: true,
      },
    ],
  }});
  client.api.applications(client.user.id).guilds('821929481681502238').commands.post({data: {
    name: 'delete',
    description: 'Delete a vent you have sent',
    options: [
      {
        name: 'id',
        type: 4,
        description: 'Id to the vent you have sent',
        required: true,
      },
    ],
  }});
  client.api.applications(client.user.id).guilds('821929481681502238').commands.post({data: {
    name: 'info',
    description: 'Provides information on the bot'
  }});
});

client.ws.on('INTERACTION_CREATE', async interaction => {
  if (interaction.data.name == 'vent') {
    vent(interaction.member, config['vent-ch'], interaction.id, interaction.token, interaction.data.options[0].value);
  } else if (interaction.data.name == 'delete') {
    if (main[interaction.data.options[0].value - 1][2] == interaction.member.user.id) {
      deleteVent(interaction.id, interaction.token, interaction.data.options[0].value);
    } else {
      reply(interaction.id, interaction.token, `This isn't your vent according to the database\nContact CatusKing#2624 if you believe this an actual error`);
    }
  } else if (interaction.data.name == 'info') {
    reply(interaction.id, interaction.token, '**How it works**\n\nVents:\n - User uses /vent\n - Bot logs and stores the users vent id with their user id(but **not** their vent) into the database\n - Vent is sent into the channel using a webhook\n\nDelete:\n - User uses /delete\n - Bot checks to make sure the vent was created by that user using the database and vent id\n\n\nCreator: <@473110112844644372>(CatusKing#2624)\nCreated: <t:1627112521:R>(7/24/2021)\nIf you would like a custom bot contact me at any time :D')
  }
});

client.on('message', (msg) => {
  if (msg.author.bot || msg.webhookID) return;

  if (msg.channel.id == config['vent-ch']) {
    if (msg.reference != null) {
      client.channels.cache.get(msg.reference.channelID).messages.fetch(msg.reference.messageID)
        .then(message => {
          if (message.webhookID != null) {
            const id = Number(message.content.split(' ')[2]);
            dm(main[id - 1][2], `This is an automated message to alert you someone replied to your vent with the id ${id}\n\nAuthor: ${msg.author.tag}\n${msg.content}\n\n**This has no way to be tracked back to you unless your vent is investigated.**`, '#9e9d9d')  
          }
        });
    }
  }
});

client.login(token.main);