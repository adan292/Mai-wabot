import { ZenCommand } from '../../lib/core/factory.js';
import { V } from '../../lib/messaging/dialogues.js';
import { ZenConfig } from '../../zen.config.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { rm } from 'fs/promises';
import { spawn } from 'child_process';
import { pipeline } from 'stream/promises';
import fg from 'fg-senna';
import ytSearch from 'yt-search';

const HIKARI_API = 'https://hikariapi.skyultraweb.com';
const SAMU_API = 'https://api.samu330.com';
const DL_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const HIKARI_KEY = ZenConfig.apiKeys?.hikari || process.env.APIKEY || process.env.HIKARI_APIKEY || '';

function extractVideoId(input) {
  if (!input) return null;
  const match = String(input).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(String(input).trim())) return String(input).trim();
  return null;
}

function sanitizeFilename(name) {
  return (name || 'audio').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').slice(0, 60).trim() || 'audio';
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function compressAudio(inputPath, outputPath) {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-vn',
      '-c:a', 'libmp3lame',
      '-b:a', '128k',
      '-ar', '44100',
      '-y',
      outputPath
    ]);
    ffmpeg.on('close', (code) => resolve(code === 0));
    ffmpeg.on('error', () => resolve(false));
  });
}

async function searchViaYtSearch(query) {
  const vidId = extractVideoId(query);
  let item = null;
  if (vidId) {
    const result = await ytSearch({ videoId: vidId });
    item = result?.videos?.[0] || result;
    if (result?.videoId) item = result;
  } else {
    const result = await ytSearch(query);
    item = result?.videos?.[0];
  }
  const id = item?.videoId || vidId;
  if (!id) throw new Error('sin_resultados');
  return {
    id,
    title: item?.title || 'YouTube Audio',
    duration: item?.duration?.timestamp || item?.timestamp || item?.duration || '-',
    thumbnail: item?.thumbnail || item?.image || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    channel: typeof item?.author === 'string' ? item.author : (item?.author?.name || 'YouTube')
  };
}

async function searchViaSamu(query) {
  const vidId = extractVideoId(query);
  if (vidId) {
    try {
      const { data } = await axios.get(`${SAMU_API}/yt/info`, {
        params: { url: `https://youtu.be/${vidId}` },
        timeout: 15000
      });
      const meta = data?.metadata || data?.data || data?.result;
      if (meta?.title) {
        return {
          id: vidId,
          title: meta.title,
          duration: meta.duration || (meta.duration_seconds ? `${Math.floor(meta.duration_seconds / 60)}:${String(meta.duration_seconds % 60).padStart(2, '0')}` : '-'),
          thumbnail: meta.thumbnail || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
          channel: meta.channel || meta.uploader || 'YouTube'
        };
      }
    } catch {}
  }
  const { data } = await axios.get(`${SAMU_API}/yt/search`, {
    params: { q: query },
    timeout: 15000
  });
  const first = data?.results?.[0] || data?.data?.[0] || data?.result?.[0];
  if (!first) throw new Error('sin_resultados');
  const id = first.id || first.videoId;
  return {
    id,
    title: first.title || 'YouTube Audio',
    duration: first.duration || '-',
    thumbnail: first.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    channel: first.uploader || first.channel || 'YouTube'
  };
}

async function searchAudio(query) {
  try {
    return await searchViaYtSearch(query);
  } catch (e) {
    console.warn(`[ytmp3] yt-search falló: ${e.message}, probando Samu`);
    return searchViaSamu(query);
  }
}

async function getSennaLink(videoId, type) {
  const quality = type === 'audio' ? 'mp3' : '360p';
  const res = await withTimeout(fg.ytv(`https://youtu.be/${videoId}`, quality), 45000);
  const url = res?.dl_url || res?.dl || res?.download || res?.url || res?.data?.dl_url;
  if (!url) throw new Error('senna_sin_enlace');
  return { url, title: res.title || res?.data?.title || 'YouTube Audio', source: 'senna' };
}

async function getSamuLink(videoId, type) {
  const { data } = await axios.get(`${SAMU_API}/yt/download`, {
    params: { url: `https://youtu.be/${videoId}`, type: type === 'audio' ? 'mp3' : 'mp4' },
    timeout: 60000
  });
  const url = data?.url || data?.data?.url || data?.result?.url || data?.download_url || data?.data?.downloadUrl;
  if (!url) throw new Error('samu_sin_enlace: ' + JSON.stringify(data).slice(0, 200));
  return { url, title: data?.title || data?.data?.title || 'YouTube Audio', source: 'samu' };
}

async function getHikariLink(videoId, type) {
  if (!HIKARI_KEY) throw new Error('hikari_sin_apikey');
  const isAudio = type === 'audio';
  const { data } = await axios.get(`${HIKARI_API}/api/scrapers/youtube/${isAudio ? 'audio' : 'video'}`, {
    params: {
      url: `https://www.youtube.com/watch?v=${videoId}`,
      quality: isAudio ? '128k' : '360p',
      apikey: HIKARI_KEY
    },
    timeout: 60000
  });
  const body = data?.response ?? data;
  const info = body?.data || body;
  const url = info?.downloadUrl || info?.url || info?.download_url;
  if (!url) throw new Error('hikari_sin_enlace');
  if (info?.status && info.status !== 'ready') throw new Error(`hikari_${info.status}`);
  const title = String(info.filename || info.title || '')
    .replace(/\.(mp3|mp4)$/i, '')
    .replace(/\s*\(\d{3,4}p[^)]*\)\s*$/i, '')
    .trim();
  return { url, title: title || 'YouTube Audio', source: 'hikari' };
}

async function streamToFile(url, outputPath) {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    timeout: 120000,
    maxRedirects: 5,
    headers: { 'User-Agent': DL_UA }
  });
  await pipeline(response.data, fs.createWriteStream(outputPath));
}

async function downloadYoutube(videoId, type, outputPath) {
  let lastError = new Error('sin_proveedor');
  for (const getLink of [getSamuLink, getSennaLink, getHikariLink]) {
    try {
      const link = await getLink(videoId, type);
      await streamToFile(link.url, outputPath);
      if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1000) {
        throw new Error('Archivo descargado vacío');
      }
      return { title: link.title, source: link.source };
    } catch (err) {
      lastError = err;
      console.warn(`[youtube] ${getLink.name}: ${err.message}`);
      await rm(outputPath, { force: true }).catch(() => {});
    }
  }
  throw lastError;
}

// FIX: Separar el handler de descarga en comando propio, no depender del alias
export const ytmp3DlHandler = new ZenCommand('ytmp3dl')
  .setHidden(true)
  .setCooldown(3)
  .setCategory('Descargas')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    if ((user.kogen || 0) < 1) {
      await ctx.react('⚠️');
      return ctx.reply(V.kogen.insufficient('descargar', 1));
    }

    // FIX: args pueden venir como [norm, id] o [id] o [doc, id]
    let type = String(ctx.args[0] || '').toLowerCase();
    let videoId = ctx.args[1];

    if (!videoId && type) {
      videoId = type;
      type = 'norm';
    }
    // Si el primer arg es el id (11 chars) y el segundo no existe
    if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      // ok
    } else if (type && /^[a-zA-Z0-9_-]{11}$/.test(type)) {
      videoId = type;
      type = 'norm';
    }

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *FORMATO INVÁLIDO*\n\n> Eso no me cierra 😵‍💫\n> Usá: ${ZenConfig.prefix}ytmp3dl norm <id>`);
    }

    const isDoc = type === 'doc' || type === 'documento' || type === 'document';
    await ctx.react('⏳');
    const tmpDir = path.resolve('./tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const rand = Math.random().toString(36).substring(7);
    const rawFilePath = path.join(tmpDir, `raw_${Date.now()}_${rand}.mp3`);
    const optFilePath = path.join(tmpDir, `ytmp3_${Date.now()}_${rand}.mp3`);

    try {
      const dl = await downloadYoutube(videoId, 'audio', rawFilePath);

      let finalPath = rawFilePath;
      // FIX: Solo comprimir si es senna, si es Samu/Hikari ya viene en mp3
      if (dl.source === 'senna') {
        const compressed = await compressAudio(rawFilePath, optFilePath);
        if (compressed && fs.existsSync(optFilePath) && fs.statSync(optFilePath).size > 1000) {
          finalPath = optFilePath;
          await rm(rawFilePath, { force: true }).catch(() => {});
        } else {
          console.warn('[ytmp3dl] conversión fallida, mandando original');
        }
      }

      let dlTitle = dl.title || 'YouTube Audio';
      if (!dl.title || dl.title === 'YouTube Audio') {
        try {
          const info = await searchAudio(videoId);
          dlTitle = info.title;
        } catch {}
      }

      const safeName = `${sanitizeFilename(dlTitle)}.mp3`;
      // FIX: Baileys necesita Buffer, no {url: pathLocal}
      const fileBuffer = fs.readFileSync(finalPath);

      if (isDoc) {
        await ctx.sock.sendMessage(ctx.chat, {
          document: fileBuffer,
          mimetype: 'audio/mpeg',
          fileName: safeName,
          caption: `🎧 *${dlTitle}*`
        }, { quoted: ctx.rawMsg });
      } else {
        await ctx.sock.sendMessage(ctx.chat, {
          audio: fileBuffer,
          mimetype: 'audio/mpeg',
          fileName: safeName,
          ptt: false
        }, { quoted: ctx.rawMsg });
      }

      user.kogen = Math.max(0, (user.kogen || 0) - 1);
      await user.save();
      await ctx.react('✅');
      await ctx.reply(V.kogen.used());
    } catch (e) {
      console.error('[ytmp3dl] error:', e);
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR DE DESCARGA*\n\n> No pude descargar el audio 😭 Probá de nuevo.\n> _Detalle: ${e.message.slice(0, 80)}_`);
    } finally {
      await rm(rawFilePath, { force: true }).catch(() => {});
      await rm(optFilePath, { force: true }).catch(() => {});
    }
  });

export default new ZenCommand('ytmp3')
  .addAlias('yta', 'ytaudio')
  .setCooldown(10)
  .setCategory('Descargas')
  .requireRegistration()
  .setUsage('<link|texto>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const prefix = ZenConfig.prefix;
    const query = ctx.args.join(' ').trim();

    if (!query) {
      await ctx.react('🎧');
      return ctx.reply(
        `『 🎧 』 *YOUTUBE MP3*\n\n` +
        `✦ *Uso:* ${prefix}ytmp3 <link|texto>\n` +
        `✦ *Costo:* 1 ${ZenConfig.currencies.kogen.emoji}\n` +
        `> _Ejemplo: ${prefix}ytmp3 sia snowman_`
      );
    }

    if ((user.kogen || 0) < 1) {
      await ctx.react('⚠️');
      return ctx.reply(V.kogen.insufficient('buscar', 1));
    }

    await ctx.react('🔍');
    let videoInfo;
    try {
      videoInfo = await searchAudio(query);
    } catch (e) {
      console.error('[ytmp3] search error:', e.message);
      await ctx.react('❌');
      return ctx.reply(`『 ⚠️ 』 *SIN RESULTADOS*\n\n> No encontré resultados 😞 Probá con otras palabras.`);
    }

    // FIX: id sin prefix, el framework lo agrega solo
    const buttons = [{
      type: 'single_select',
      title: 'Elegir formato',
      sections: [{
        title: 'Formatos de audio',
        rows: [
          { header: '', title: 'Audio (MP3)', description: 'Reproductor de audio estándar', id: `ytmp3dl norm ${videoInfo.id}` },
          { header: '', title: 'Audio (Documento)', description: 'Archivo original descargable', id: `ytmp3dl doc ${videoInfo.id}` }
        ]
      }]
    }];

    await ctx.sock.sendButtons(ctx.chat, {
      text: `╔━᳀『 🎧 *YOUTUBE MP3* 』═᳀\n⌬ *Título:* ${videoInfo.title}\n⌬ *Canal:* ${videoInfo.channel}\n⌬ *Duración:* ${videoInfo.duration}\n⌬ Selecciona el formato para descargar:\n╚═━═━═━═━═━═━═━═᳀`,
      footer: ZenConfig.botName,
      image: videoInfo.thumbnail,
      buttons
    });
  });