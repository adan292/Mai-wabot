import db from "#db";
import ytsearch from "yt-search";
import axios from "axios";
import sharp from "sharp";

async function fetchBuffer(url) {
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 });
  return Buffer.from(res.data);
}

function formatSize(mb) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(2)} MB`;
}

function isValidAudio(buf) {
  if (!buf || buf.length < 1000) return false;
  // si es html es que falló la api
  const head = buf.slice(0, 200).toString().toLowerCase();
  if (head.includes('<html') || head.includes('<!doctype')) return false;
  return true;
}

export default {
  command: ["play", "mp3", "ytmp3", "ytaudio", "playaudio"],
  category: "downloader",
  run: async ({ msg, sock, args, command }) => {
    try {
      if (!args[0]) {
        return msg.reply("Ay Senpai... escribe el nombre de la canción. Ej: #play diles - bad bunny 🐰");
      }

      const apiCfg = global.api || globalThis.api || {
        url: process.env.API_URL || "",
        key: process.env.API_KEY || ""
      };

      if (!apiCfg.url || !apiCfg.key) {
        return msg.reply("《✧》 La API de descarga no está configurada, Senpai.");
      }

      const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";
      const settings = (await db.getSettings(botId)) || {};
      const botOfc = global?.sock?.user?.id?.split(":")[0] + "@s.whatsapp.net" || "";
      const isOficialBot = botId === botOfc;
      const isModBot = Number(settings.botmod) === 1;
      const isPremiumBot = Number(settings.botprem) === 1;

      const maxSize = isOficialBot ? 5 * 1024 : isModBot ? 3 * 1024 : isPremiumBot ? 2 * 1024 : 100;

      const text = args.join(" ");
      await msg.reply(`Ay... buscando *${text}*, espera un momento, tonto Senpai...`);

      const searchResult = await ytsearch(text);
      if (!searchResult?.videos?.length) {
        return msg.reply("No encontré nada, Senpai... ¿escribiste bien?");
      }

      const video = searchResult.videos[0];
      const { author, timestamp: duration, views, url, image, seconds } = video;
      const title = String(video.title || "audio");
      const vistas = (views || 0).toLocaleString();
      const canal = author?.name || "Desconocido";

      const estimatedMB = ((seconds || 0) * 128000) / 8 / (1024 * 1024);
      if (estimatedMB > maxSize) {
        return msg.reply(`Ay, pesa *${formatSize(estimatedMB)}* y solo puedo mandar *${formatSize(maxSize)}* en este bot, Senpai.`);
      }

      const thumbBuffer = await fetchBuffer(image);

      const caption = `╭─「 *MAI MUSIC* 🐰 」─╮
│
│  ✿ *${title}*
│
│  ⴵ Canal: ${canal}
│  ⏱️ Duración: ${duration}
│  👁️ Vistas: ${vistas}
│  🔗 ${url}
│
╰──  *Enviando audio, espera...*  ──╯`;

      await sock.sendMessage(msg.chat, { image: thumbBuffer, caption }, { quoted: msg });

      let audioBuffer = null;
      let audioTitle = title;
      const baseUrl = String(apiCfg.url).replace(/\/+$/, "");

      const endpoints = [
        { name: "v1", url: `${baseUrl}/dl/ytmp3?url=${encodeURIComponent(url)}&key=${apiCfg.key}`, pick: d => d?.data?.dl || d?.result?.dl || d?.dl },
        { name: "v2", url: `${baseUrl}/dl/ytmp3v2?url=${encodeURIComponent(url)}&key=${apiCfg.key}`, pick: d => d?.data?.dl || d?.result?.dl || d?.dl },
        { name: "v3", url: `${baseUrl}/dl/ytmp3v3?url=${encodeURIComponent(url)}&key=${apiCfg.key}`, pick: d => d?.data?.dl || d?.result?.dl || d?.dl },
      ];

      for (const it of endpoints) {
        if (audioBuffer) break;
        try {
          const res = await axios.get(it.url, { timeout: 25000 });
          const dlUrl = it.pick(res.data);
          if (!dlUrl) continue;

          const buf = await fetchBuffer(dlUrl);
          if (!isValidAudio(buf)) {
            console.log(`[play] ${it.name} devolvió html/no-audio`);
            continue;
          }
          audioBuffer = buf;
          audioTitle = res.data?.data?.title || res.data?.title || title;
          console.log(`[play] éxito con ${it.name}`);
        } catch (e) {
          console.log(`[play] ${it.name} falló: ${e.message}`);
        }
      }

      // fallback v4 que devuelve buffer directo
      if (!audioBuffer) {
        try {
          const resV4 = await axios.get(`${baseUrl}/dl/ytmp3v4?url=${encodeURIComponent(url)}&key=${apiCfg.key}`, {
            responseType: "arraybuffer", timeout: 40000
          });
          const buf = Buffer.from(resV4.data);
          if (isValidAudio(buf)) audioBuffer = buf;
        } catch (e) {
          console.log(`[play] v4 falló: ${e.message}`);
        }
      }

      if (!audioBuffer) {
        return msg.reply("Ay Senpai... no pude descargar el audio, la API está fallando. Intenta más tarde.");
      }

      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > maxSize) {
        return msg.reply(`Pesa *${formatSize(sizeMB)}* y supera el límite *${formatSize(maxSize)}*`);
      }

      const safeTitle = String(audioTitle).replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 60) || "audio";
      let thumbSmall;
      try {
        thumbSmall = await sharp(thumbBuffer).resize(300, 300).jpeg({ quality: 80 }).toBuffer();
      } catch {
        thumbSmall = thumbBuffer;
      }

      const isAudioNormal = command === "playaudio" || command === "ytaudio";

      if (isAudioNormal || sizeMB < 10) {
        await sock.sendMessage(msg.chat, {
          audio: audioBuffer,
          mimetype: "audio/mpeg",
          ptt: false,
          fileName: `${safeTitle}.mp3`
        }, { quoted: msg });
      } else {
        await sock.sendMessage(msg.chat, {
          document: audioBuffer,
          mimetype: "audio/mpeg",
          fileName: `${safeTitle}.mp3`,
          jpegThumbnail: thumbSmall
        }, { quoted: msg });
      }

    } catch (e) {
      console.error('[PLAY ERROR]', e);
      await msg.reply(`Ay... hubo un error, Senpai: ${e.message}`);
    }
  }
};