import db from "#db";
import { commands } from '../../lib/system/comandos.js';

export default {
  command: ['menu', 'help', 'allmenu'],
  category: 'info',
  desc: 'Menú oficial by adánzx7',
  run: async ({ msg, sock, args, usedPrefix: prefix }) => {
    try {
      const banner = 'https://cdn.dix.lat/me/9klt_20261030-r2x1-vn3a-d60f.jpg';
      const channelLink = 'https://whatsapp.com/channel/0029Vb7OVMwJf05bKntqZx1G';
      const ownerName = 'adánzx7';

      const botId = sock?.user?.id.split(':')[0] + '@s.whatsapp.net';
      
      // FIX AQUÍ - sin .catch
      let botSettings = {};
      try {
        botSettings = db.getSettings(botId) || {};
        if (botSettings.then) botSettings = await botSettings;
      } catch { botSettings = {}; }

      const botname = botSettings?.namebot || 'Gogeta-Bot';
      const botname2 = botSettings?.namebot2 || 'Gogeta';

      let menuText = `╭━━━〘 *${botname}* 〙━━━╮
┃  👑 Creador: ${ownerName}
┃  ⚡ Prefijo: ${prefix}
┃  📦 Comandos: ${commands.length}
╰━━━━━━━━━━━━━━━╯

> Hola, soy *${botname2}*
> Canal: ${channelLink}

${String.fromCharCode(8206).repeat(4000)}`;

      const categorias = {};
      for (const cmd of commands) {
        let cat = (cmd.category || 'otros').toLowerCase();
        if (!categorias[cat]) categorias[cat] = [];
        categorias[cat].push(cmd);
      }

      const emojiCat = {
        anime: '🌸', download: '📥', economia: '💰', gacha: '🎲',
        grupo: '👥', ia: '🤖', info: '📜', nsfw: '🔞',
        profile: '👤', search: '🔎', sockets: '🔌', stickers: '✨', utils: '🛠️', otros: '📁'
      };

      for (const [cat, cmds] of Object.entries(categorias)) {
        const icono = emojiCat[cat] || '❖';
        menuText += `\n╭─「 ${icono} *${cat.toUpperCase()}* 」─╮\n`;
        cmds.forEach(c => {
          let cmdName = c.command?.[0] || c.alias?.[0] || 'sin-nombre';
          menuText += `│  ◦ ${prefix}${cmdName} ${c.uso ? c.uso : ''}\n`;
        });
        menuText += `╰───────────────╯\n`;
      }

      menuText += `\n> ✨ *Powered by ${ownerName}*`;

      await sock.sendMessage(msg.chat, {
        image: { url: banner },
        caption: menuText,
        contextInfo: {
          externalAdReply: {
            title: `${botname2} | By ${ownerName}`,
            body: 'Gogeta-Bot - Menú Oficial',
            thumbnailUrl: banner,
            sourceUrl: channelLink,
            mediaType: 1,
            renderLargerThumbnail: true
          }
        }
      }, { quoted: msg });

    } catch (e) {
      console.error('[MENU ERROR]', e);
      await sock.sendMessage(msg.chat, { text: `❌ Error: ${e.stack}` }, { quoted: msg });
    }
  }
};