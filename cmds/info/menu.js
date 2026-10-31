import db from "#db";
import { commands } from '../../lib/system/comandos.js';
import { linksPreview } from '#serialize';

export default {
  command: ['allmenu', 'help', 'menu'],
  category: 'info',
  desc: 'Muestra el menú completo',
  run: async ({ msg, sock, args, usedPrefix: prefix }) => {
    try {
      const botId = sock?.user?.id.split(':')[0] + '@s.whatsapp.net' || '';
      const botSettings = await db.getSettings(botId);
      
      const botname = botSettings.namebot || 'Gogeta-Bot';
      const botname2 = botSettings.namebot2 || 'Gogeta';
      const banner = botSettings.banner || 'https://cdn.dix.lat/me/9klt_20261030-r2x1-vn3a-d60f.jpg';
      const ownerId = botSettings.owner || 'adanzx7';
      const links = botSettings.link || 'https://api.alyacore.xyz';
      
      // CANAL OFICIAL FIJO DE adánzx7
      const channelLink = `https://whatsapp.com/channel/0029Vb7OVMwJf05bKntqZx1G`;

      const oficialId = global?.sock ? global.sock.user.id.split(':')[0] + '@s.whatsapp.net' : '';
      const isOficialBot = botId === oficialId;
      const botType = isOficialBot ? '𝐎𝐰𝐧𝐞𝐫' : '𝐒𝐮𝐛-𝐁𝐨𝐭';

      const own = await db.getUser(ownerId);
      const ownerName = own?.name || ownerId.replace(/@s\.whatsapp\.net$/, '') || 'adánzx7';

      let menu = `‎   ── ˙ ¡𝐇ola!, soy ${botname2} (*${botType}*) .
✎ ᴀǫᴜɪ ᴛɪᴇɴᴇs ʟᴀ ʟɪsᴛᴀ ᴅᴇ ʟᴏs ᴄᴏᴍᴀɴᴅᴏs

︵𝆣᷼ ͡︵᷼𝆣 ᷼͡︵᷼𝆣 ᷼͡︵ ᅟິᅟᅟ︵𝆣᷼ ͡︵᷼𝆣 ᷼͡︵᷼𝆣 ᷼͡︵

- 𐫦ϟ │ 𝐄nlace ❚❙    ❀  
⸺　${links}
- 𐫦ϟ │ 𝐃eveloper  ❚❙    ✿  
⸺　${ownerName}

ᅟᅟ︶͜︶͜︶ᅟᅟ֪ᅟ֪ᅟᅟ︶͜︶͜︶

> ૮(˶ᵔᕕᔔ˶)ა Conéctate como *SubBot* en nuestra web oficial:
> ✐ ${channelLink}

${String.fromCharCode(8206).repeat(4000)}`;

      const categoryArg = args[0]?.toLowerCase();
      const categories = {};

      for (const command of commands) {
        const category = (command.category || 'otros').toLowerCase();
        if (!categories[category]) categories[category] = [];
        categories[category].push(command);
      }

      const categoryEmojisList = [
        "˚୨•(=^●ω●^=)•", "☆(ゝω·)>", "ღゝ◡╹ )ノ", "ଘ៸៸᳐⦁⩊⦁៸៸᳐ଓ", 
        "(•ૢ⚈͒⌄⚈͒•ૢ)", "ฅ^·ﻌ·^ฅ", "≽^• ˕ • ྀི≼", "(𓂂꜆◕⩊◕꜀𓂂)", 
        "ʚ(꒪ˊ꒳ˋ꒪)ɞ", "ෆ(՞ ⌯'ᵕ'⌯ ՞)ෆ ̖́-", "(ᯫ᳐˶ꔷ֊ꔷᯫ᳐)ฅ", "(✿◡‿◡)", "ᜊ(꒪ˊ꒳ˋ꒪)ᜊ"
      ];

      const categoryNameMap = {
        'anime': '𝐀𝗇𝗂𝗆𝖾',
        'download': '𝐃ownload',
        'economia': '𝐄conomia',
        'gacha': '𝐆acha',
        'grupo': '𝐆rupo',
        'ia': '𝐈a',
        'info': '𝐈nfo',
        'nsfw': '𝐍sfw',
        'profile': '𝐏rofile',
        'search': '𝐒earch',
        'sockets': '𝐒ocket',
        'socket': '𝐒ocket',
        'stickers': '𝐒ticker',
        'sticker': '𝐒ticker',
        'utils': '𝐔tils',
        'otros': '𝐎tros'
      };

      const categoryDescriptions = {
        'anime': 'Comandos de reacciones de anime.',
        'download': 'Comandos de Descargas para descargar archivos de varias fuentes.',
        'economia': 'Comandos de Economía para ganar dinero y divertirte.',
        'gacha': 'Comandos de Gacha para reclamar y intercambiar personajes.',
        'grupo': 'Comandos para administradores de grupos.',
        'ia': 'Comandos de Inteligencia Artificial.',
        'info': 'Comandos de información general del bot.',
        'nsfw': 'Comandos NSFW (contenido para adultos).',
        'profile': 'Comandos de Perfil para ver y configurar tu perfil.',
        'search': 'Comandos de búsqueda en diferentes plataformas.',
        'sockets': 'Comandos para registrar tu propio Sub-Bot.',
        'stickers': 'Comandos de Stickers para crear y gestionar stickers.',
        'utils': 'Comandos de Utilidades para el día a día.'
      };

      const availableCategories = Object.keys(categories);

      if (categoryArg && !availableCategories.includes(categoryArg)) {
        return msg.reply(
          `《✤》 La categoría *${categoryArg}* no fue encontrada.\n\n> Categorías disponibles:\n${availableCategories.map(c => `› ${prefix}${c}`).join('\n')}`
        );
      }

      let emojiIndex = 0;

      for (const [category, cmds] of Object.entries(categories)) {
        if (categoryArg && category.toLowerCase() !== categoryArg) continue;

        const catName = categoryNameMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
        const catEmoji = categoryEmojisList[emojiIndex % categoryEmojisList.length];
        emojiIndex++;
        const description = categoryDescriptions[category] || `Comandos de ${catName}.`;

        menu += `\n- ꪆ  ❬ ${catEmoji} ❭  *\`${catName}\`*  ᰨᰍ    *;*\n`;
        menu += `> ✐ ${description}\n\n`;

        cmds.forEach((cmd) => {
          const aliases = (cmd.alias && cmd.alias.length > 0 ? cmd.alias : cmd.command || [])
            .map((a) => {
              const aliasClean = a.split(/[\/#!+.\-]+/).pop().toLowerCase();
              return `${prefix}${aliasClean}`;
            })
            .join(' › ');
          menu += `❀   ᠀᠀ㅤ۟  ${aliases} ${cmd.uso ? `+ ${cmd.uso}` : ''}\n`;
          menu += `> ── 𑁪ㅤׅㅤ۫ _${cmd.desc || 'Sin descripción'}_\n`;
        });

        menu += `\n ㅤׅㅤ۫ㅤㅤ      ﹙❀﹚ㅤׅㅤㅤ˚ㅤ\n`;
      }

      const isVideo = banner.endsWith('.mp4') || banner.includes('.mp4') || banner.includes('.gif');

      if (isVideo) {
        return sock.sendMessage(
          msg.chat,
          { video: { url: banner }, caption: menu.trim() },
          { quoted: msg }
        );
      }

      let preview;
      try {
        const imgPrev = await linksPreview(sock, banner);
        preview = {
          'canonical-url': channelLink,
          'matched-text': channelLink,
          title: botname,
          description: `${botname2}, Built With 🤍 By ${ownerName}`,
          jpegThumbnail: imgPrev?.jpegThumbnail ? Buffer.from(imgPrev.jpegThumbnail) : undefined,
        }
      } catch {}

      return sock.sendMessage(
        msg.chat,
        { text: menu, linkPreview: preview ? { ...preview, showAdAttribution: true } : undefined },
        { quoted: msg }
      );

    } catch (e) {
      console.error(e);
      await msg.reply(`❌ Error en el menú: ${e.message}`);
    }
  },
};