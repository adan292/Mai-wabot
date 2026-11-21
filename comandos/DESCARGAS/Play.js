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

// APIKEY desde tu config, no de process.env
const HIKARI_KEY = ZenConfig.apiKeys?.hikari || process.env.APIKEY || process.env.HIKARI_APIKEY || '';

function extractVideoId(input) {
  if (!input) return null;
  const match = String(input).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(String(input).trim())) return String(input).trim();
  return null;
}

function sanitizeFilename(name) {
  return (name || 'media').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').slice(0, 60).trim() || 'media';
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
    // yt-search con videoId a veces devuelve el objeto directo, a veces {videos:[]}
    const result = await ytSearch({ videoId: vidId });
    item = result?.videos?.[0] || result;
    // Si result es el video mismo
    if (result?.videoId) item = result;
  } else {
    const result = await ytSearch(query);
    item = result?.videos?.[0];
  }
  const id = item?.videoId || vidId;
  if (!id) throw new Error('sin_resultados');
  return {
    id,
    title: item?.title || 'YouTube Media',
    duration: item?.duration?.timestamp || item?.timestamp || item?.duration || '-',
    thumbnail: item?.thumbnail || item?.image || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
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
          thumbnail: meta.thumbnail || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`
        };
      }
    } catch {}
  }
  const { data } = await axios.get(`${SAMU_API}/yt/search`, {
    params: { q: query },
    timeout: 15000
  });
  const first = data?.results?.[0] || data?.data?.[0] || data?.result?.[0];
  if (!first?.id && !first?.videoId) throw new Error('sin_resultados');
  const id = first.id || first.videoId;
  return {
    id,
    title: first.title || 'YouTube Media',
    duration: first.duration || '-',
    thumbnail: first.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  };
}

async function searchMedia(query) {
  try {
    return await searchViaYtSearch(query);
  } catch (e) {
    console.warn(`[youtube] yt-search falló: ${e.message}, probando Samu`);
    return searchViaSamu(query);
  }
}

async function getSennaLink(videoId, type) {
  // fg-senna: ytv(url, calidad) - para audio usa 'mp3', para video '360p'
  const quality = type === 'audio' ? 'mp3' : '360p';
  const res = await withTimeout(fg.ytv(`https://youtu.be/${videoId}`, quality), 45000);
  // senna cambia el campo según versión
  const url = res?.dl_url || res?.dl || res?.download || res?.url || res?.data?.dl_url;
  if (!url) throw new Error('senna_sin_enlace');
  return { url, title: res.title || res?.data?.title || 'YouTube Media', source: 'senna' };
}

async function getSamuLink(videoId, type) {
  const { data } = await axios.get(`${SAMU_API}/yt/download`, {
    params: { url: `https://youtu.be/${videoId}`, type: type === 'audio' ? 'mp3' : 'mp4' },
    timeout: 60000
  });
  const url = data?.url || data?.data?.url || data?.result?.url || data?.download_url || data?.data?.downloadUrl;
  if (!url) throw new Error('samu_sin_enlace: ' + JSON.stringify(data).slice(0, 200));
  return { url, title: data?.title || data?.data?.title || 'YouTube Media', source: 'samu' };
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
  if (!body?.success && !url) throw new Error('hikari_sin_enlace');
  if (info?.status && info.status !== 'ready') throw new Error(`hikari_${info.status}`);
  const title = String(info.filename || info.title || '')
    .replace(/\.(mp3|mp4)$/i, '')
    .replace(/\s*\(\d{3,4}p[^)]*\)\s*$/i, '')
    .trim();
  return { url, title: title || 'YouTube Media', source: 'hikari' };
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
  // Orden: Samu es más estable, luego Senna, luego Hikari
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

export default new ZenCommand('play')
  .addAlias('playvid', 'play2')
  .setCooldown(10)
  .setCategory('Descargas')
  .requireRegistration()
  .setUsage('<texto|link>')
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    const query = ctx.args.join(' ').trim();
    const prefix = ZenConfig.prefix;

    if (!query) {
      await ctx.react('▶️');
      return ctx.reply(
        `『 ▶️ 』 *YOUTUBE PLAY*\n\n` +
        `✦ *Uso:* ${prefix}${ctx.commandName} <texto|link>\n` +
        `✦ *Costo:* 1 ${ZenConfig.currencies.kogen.emoji}\n` +
        `> _Ejemplo: ${prefix}${ctx.commandName} sia snowman_`
      );
    }

    if ((user.kogen || 0) < 1) {
      await ctx.react('⚠️');
      return ctx.reply(V.kogen.insufficient('buscar', 1));
    }

    await ctx.react('🔍');
    let videoInfo;
    try {
      videoInfo = await searchMedia(query);
    } catch (e) {
      console.error('[play] search error:', e.message);
      await ctx.react('❌');
      return ctx.reply(`『 ⚠️ 』 *SIN RESULTADOS*\n\n> No encontré nada en YouTube 😢 Probá con otro título.`);
    }

    const videoId = videoInfo.id;
    // FIX: Sin prefix en el id del botón, el framework lo agrega solo
    const buttons = [
      { type: 'quick_reply', text: '🎵 Audio', id: `playdl audio ${videoId}` },
      { type: 'quick_reply', text: '🎬 Video', id: `playdl video ${videoId}` }
    ];

    await ctx.sock.sendButtons(ctx.chat, {
      text: `╔━᳀『 ▶️ *YOUTUBE PLAY* 』═᳀\n⌬ *Título:* ${videoInfo.title}\n⌬ *Duración:* ${videoInfo.duration}\n⌬ Elige el formato para recibirlo en documento:\n╚═━═━═━═━═━═━═━═᳀`,
      footer: ZenConfig.botName,
      image: videoInfo.thumbnail,
      buttons
    });
  });

export const playDlHandler = new ZenCommand('playdl')
  .setHidden(true)
  .setCooldown(3)
  .setCategory('Descargas')
  .requireRegistration()
  .onExecute(async (ctx) => {
    const user = await ctx.getUser();
    // FIX: Normalizar type, soporta mp3/mp4/audio/video
    let typeRaw = String(ctx.args[0] || '').toLowerCase();
    const videoId = ctx.args[1];

    if (!typeRaw || !videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *FORMATO INVÁLIDO*\n\n> Uy, algo no cuadra 🤨\n> Usá: ${ZenConfig.prefix}playdl audio <id>`);
    }

    const isAudio = typeRaw === 'audio' || typeRaw === 'mp3';
    const isVideo = typeRaw === 'video' || typeRaw === 'mp4';
    if (!isAudio && !isVideo) {
      return ctx.reply(`『 ⚠️ 』 *FORMATO INVÁLIDO*\n\n> Usá audio o video`);
    }

    if ((user.kogen || 0) < 1) {
      await ctx.react('⚠️');
      return ctx.reply(V.kogen.insufficient('descargar', 1));
    }

    await ctx.react('⏳');
    const ext = isAudio ? 'mp3' : 'mp4';
    const mime = isAudio ? 'audio/mpeg' : 'video/mp4';
    const tmpDir = path.resolve('./tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const rand = Math.random().toString(36).substring(7);
    const rawFilePath = path.join(tmpDir, `raw_${Date.now()}_${rand}.${isAudio ? 'mp3' : 'mp4'}`);
    const optFilePath = path.join(tmpDir, `play_${Date.now()}_${rand}.mp3`);

    try {
      const dl = await downloadYoutube(videoId, isAudio ? 'audio' : 'video', rawFilePath);

      let finalPath = rawFilePath;
      // FIX: Solo comprimir si es senna y el archivo no es mp3 válido. Si ya es de Samu/Hikari, no tocar.
      if (isAudio && dl.source === 'senna') {
        const compressed = await compressAudio(rawFilePath, optFilePath);
        if (compressed && fs.existsSync(optFilePath) && fs.statSync(optFilePath).size > 1000) {
          finalPath = optFilePath;
          await rm(rawFilePath, { force: true }).catch(() => {});
        } else {
          // Si falla la conversión, igual mandar el original, no tirar error
          console.warn('[playdl] conversión fallida, mandando original');
        }
      }

      let dlTitle = dl.title || 'YouTube Media';
      if (!dl.title || dl.title === 'YouTube Media') {
        try {
          const info = await searchMedia(videoId);
          dlTitle = info.title;
        } catch {}
      }

      const safeName = `${sanitizeFilename(dlTitle)}.${ext}`;
      // FIX: Baileys necesita Buffer para documento local
      const fileBuffer = fs.readFileSync(finalPath);
      await ctx.sock.sendMessage(ctx.chat, {
        document: fileBuffer,
        mimetype: mime,
        fileName: safeName,
        caption: isAudio ? `🎧 *${dlTitle}*` : `🎬 *${dlTitle}*`
      }, { quoted: ctx.rawMsg });

      user.kogen = Math.max(0, (user.kogen || 0) - 1);
      await user.save();
      await ctx.react('✅');
      await ctx.reply(V.kogen.used());
    } catch (e) {
      console.error('[playdl] error:', e);
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR DE DESCARGA*\n\n> El servidor no me dejó descargarlo 😤 Probá de nuevo.\n> _Detalle: ${e.message.slice(0, 80)}_`);
    } finally {
      await rm(rawFilePath, { force: true }).catch(() => {});
      await rm(optFilePath, { force: true }).catch(() => {});
    }
  });