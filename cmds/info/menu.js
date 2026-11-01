import db from '#db';
import { commands } from '../../lib/system/comandos.js';
import { linksPreview } from '#serialize';

export default {
  command: ['allmenu', 'help', 'menu'],
  category: 'info',
  desc: 'Muestra el menú completo',

  run: async ({ msg, sock, args = [], usedPrefix: prefix = '.' }) => {
    try {
      const botNumber = sock.user?.id?.split(':')[0]?.split('@')[0];
      const botId = botNumber ? `${botNumber}@s.whatsapp.net` : '';

      const botSettings = (await db.getSettings(botId)) || {};

      const botname = botSettings.namebot || 'Gogeta-Bot';
      const botname2 = botSettings.namebot2 || 'Gogeta';

      const defaultBanner = 'https://cdn.dix.lat/me/9klt_20261030-r2x1-vn3a-d60f.jpg';
      const banner = botSettings.banner || defaultBanner;

      const ownerId = botSettings.owner || 'adanzx7';
      const links = botSettings.link || 'https://api.alyacore.xyz';

      const channelLink = 'https://whatsapp.com/channel/0029Vb7OVMwJf05bKntqZx1G';

      const oficialNumber = globalThis.sock?.user?.id
        ?.split(':')[0]
        ?.split('@')[0];

      const oficialId = oficialNumber
        ? `${oficialNumber}@s.whatsapp.net`
        : '';

      const isOficialBot = Boolean(botId && botId === oficialId);
      const botType = isOficialBot ? '𝐎𝐰𝐧𝐞𝐫' : '𝐒𝐮𝐛-𝐁𝐨𝐭';

      const own = await db.getUser(ownerId);
      const ownerName = own?.name || ownerId.replace(/@s\.whatsapp\.net$/, '');

      let menu = `‎   ── ˙ ¡𝐇ola!, soy ${botname2} (*${botType}*) .
✎ ᴀǫᴜɪ ᴛɪᴇɴᴇs ʟᴀ ʟɪsᴛᴀ ᴅᴇ ʟᴏs ᴄᴏᴍᴀɴᴅᴏs

︵𝆣᷼ ͡︵᷼𝆣 ᷼͡︵᷼𝆣 ᷼͡︵ ᅟິᅟᅟ︵𝆣᷼ ͡︵᷼𝆣 ᷼͡︵᷼𝆣 ᷼͡︵

- 𐫦ϟ │ 𝐄nlace ❚❙    ❀
⸺　${links}
- 𐫦ϟ │ 𝐃eveloper ❚❙    ✿
⸺　${ownerName}

ᅟᅟ︶͜︶͜︶ᅟᅟ֪ᅟ֪ᅟᅟ︶͜︶͜︶

> ૮(˶ᵔᕕᔔ˶)ა Conéctate como *SubBot* en nuestra web oficial:
> ✐ ${channelLink}
`;

      const categoryArg = args[0]?.toLowerCase();
      const categories = {};

      for (const command of commands) {
        const category = (command.category || 'otros').toLowerCase();

        if (!categories[category]) {
          categories[category] = [];
        }

        categories[category].push(command);
      }

      const categoryEmojisList = [
        '˚୨•(=^●ω●^=)•',
        '☆(ゝω·)>',
        'ღゝ◡╹ )ノ',
        'ଘ៸៸᳐⦁⩊⦁៸៸᳐ଓ',
        '(•ૢ⚈͒⌄⚈͒•ૢ)',
        'ฅ^·ﻌ·^ฅ',
        '≽^• ˕ • ྀི≼',
        '(𓂂꜆◕⩊◕꜀𓂂)',
        'ʚ(꒪ˊ꒳ˋ꒪)ɞ',
        "ෆ(՞ ⌯'ᵕ'⌯ ՞)ෆ ̖́-",
        '(ᯫ᳐˶ꔷ֊ꔷᯫ᳐)ฅ',
        '(✿◡‿◡)',
        'ᜊ(꒪ˊ꒳ˋ꒪)ᜊ'
      ];

      const categoryNameMap = {
        anime: '𝐀𝗇𝗂𝗆𝖾',
        download: '𝐃ownload',
        economia: '𝐄conomia',
        gacha: '𝐆acha',
        grupo: '𝐆rupo',
        ia: '𝐈a',
        info: '𝐈nfo',
        nsfw: '𝐍sfw',
        profile: '𝐏rofile',
        search: '𝐒earch',
        sockets: '𝐒ocket',
        socket: '𝐒ocket',
        stickers: '𝐒ticker',
        sticker: '𝐒ticker',
        utils: '𝐔tils',
        otros: '𝐎tros'
      };

      const categoryDescriptions = {
        anime: 'Comandos de reacciones de anime.',
        download: 'Comandos de Descargas para descargar archivos de varias fuentes.',
        economia: 'Comandos de Economía para ganar dinero y divertirte.',
        gacha: 'Comandos de Gacha para reclamar e intercambiar personajes.',
        grupo: 'Comandos para administradores de grupos.',
        ia: 'Comandos de Inteligencia Artificial.',
        info: 'Comandos de información general del bot.',
        nsfw: 'Comandos NSFW (contenido para adultos).',
        profile: 'Comandos de Perfil para ver y configurar tu perfil.',
        search: 'Comandos de búsqueda en diferentes plataformas.',
        sockets: 'Comandos para registrar tu propio Sub-Bot.',
        stickers: 'Comandos de Stickers para crear y gestionar stickers.',
        utils: 'Comandos de Utilidades para el día a día.'
      };

      const availableCategories = Object.keys(categories);

      if (categoryArg && !availableCategories.includes(categoryArg)) {
        return await msg.reply(
          `《✤》 La categoría *${categoryArg}* no fue encontrada.\n\n` +
          `> Categorías disponibles:\n` +
          availableCategories.map(category => `› ${prefix}${category}`).join('\n')
        );
      }

      let emojiIndex = 0;

      for (const [category, cmds] of Object.entries(categories)) {
        if (categoryArg && category !== categoryArg) {
          continue;
        }

        const catName = categoryNameMap[category] ||
          category.charAt(0).toUpperCase() + category.slice(1);

        const catEmoji = categoryEmojisList[
          emojiIndex % categoryEmojisList.length
        ];

        const description = categoryDescriptions[category] ||
          `Comandos de ${catName}.`;

        emojiIndex++;

        menu += `\n- ꪆ  ❬ ${catEmoji} ❭  *\`${catName}\`*  ᰨᰍ    *;*\n`;
        menu += `> ✐ ${description}\n\n`;

        for (const cmd of cmds) {
          const commandAliases = cmd.alias?.length
            ? cmd.alias
            : cmd.command || [];

          const aliasList = Array.isArray(commandAliases)
            ? commandAliases
            : [commandAliases];

          const aliases = aliasList
            .filter(Boolean)
            .map(alias => {
              const aliasClean = String(alias)
                .split(/[\/#!+.\-]+/)
                .pop()
                .toLowerCase();

              return `${prefix}${aliasClean}`;
            })
            .join(' › ');

          menu += `❀   ᠀᠀ㅤ۟  ${aliases} ${cmd.uso ? `+ ${cmd.uso}` : ''}\n`;
          menu += `> ── 𑁪ㅤׅㅤ۫ _${cmd.desc || 'Sin descripción'}_\n`;
        }

        menu += `\n ㅤׅㅤ۫ㅤㅤ      ﹙❀﹚ㅤׅㅤㅤ˚ㅤ\n`;
      }

      const thumbnailUrl = /\.(mp4|gif)(?:[?#]|$)/i.test(banner)
        ? defaultBanner
        : banner;

      let thumbnail;

      try {
        const preview = await linksPreview(sock, thumbnailUrl);

        if (preview?.jpegThumbnail) {
          thumbnail = Buffer.from(preview.jpegThumbnail);
        }
      } catch (error) {
        console.error('Error al generar miniatura:', error);
      }

      const externalAdReply = {
        title: botname,
        body: `${botname2}, Built With 🤍 By ${ownerName}`,
        mediaType: 1,
        thumbnailUrl,
        sourceUrl: links,
        renderLargerThumbnail: true,
        showAdAttribution: false,
        ...(thumbnail ? { thumbnail } : {})
      };

      return await sock.sendMessage(
        msg.chat,
        {
          text: menu.trim(),
          linkPreview: null,
          contextInfo: {
            externalAdReply
          }
        },
        {
          quoted: msg
        }
      );
    } catch (error) {
      console.error('Error en el menú:', error);

      return await msg.reply(
        `❌ Error en el menú: ${error.message}`
      );
    }
  }
};