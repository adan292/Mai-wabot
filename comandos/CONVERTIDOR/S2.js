import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { ZenCommand } from '../../lib/core/factory.js';
import { runtimePath } from '../../lib/runtime/tmpdir.js';
import { stickerFromBuffer } from '../../lib/media/sticker.js';

const execFileAsync = promisify(execFile);
const MAX_SECONDS = 9.5;

const unwrap = (message) => {
  let current = message;
  for (let i = 0; i < 5 && current; i++) {
    const wrapper = [
      'ephemeralMessage',
      'viewOnceMessage',
      'viewOnceMessageV2',
      'viewOnceMessageV2Extension',
      'documentWithCaptionMessage'
    ].find((key) => current[key]?.message);

    if (!wrapper) break;
    current = current[wrapper].message;
  }
  return current || {};
};

const findVideo = (message) => {
  const body = unwrap(message);
  return body.videoMessage ? { body, media: body.videoMessage } : null;
};

const getVideoSource = (ctx) => {
  const ownVideo = findVideo(ctx.rawMsg.message);
  if (ownVideo) return ownVideo;

  const quotedMessage = ctx.getQuoted()?.message;
  return quotedMessage ? findVideo(quotedMessage) : null;
};

const downloadVideo = async (ctx, body, media) => {
  const candidates = [media, body];

  for (const candidate of candidates) {
    try {
      const result = await ctx.sock.downloadMedia(candidate, 'video');
      const buffer = Buffer.from(result || []);
      if (buffer.length > 0) return buffer;
    } catch {}
  }

  throw new Error('No se pudo descargar el video.');
};

const runFfmpeg = async (inputPath, audioPath) => {
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';

  await execFileAsync(ffmpeg, [
    '-y',
    '-i', inputPath,
    '-t', String(MAX_SECONDS),
    '-vn',
    '-map', '0:a:0',
    '-c:a', 'libopus',
    '-b:a', '48k',
    '-ar', '48000',
    '-ac', '1',
    '-application', 'voip',
    audioPath
  ], {
    timeout: 60_000,
    maxBuffer: 2 * 1024 * 1024
  });
};

export default new ZenCommand('s2')
  .setCooldown(5)
  .setCategory('convertidores')
  .requireRegistration()
  .setUsage('(enviá un video o responde a uno)')
  .onExecute(async (ctx) => {
    const source = getVideoSource(ctx);

    if (!source) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *VIDEO REQUERIDO*\n\n` +
        `> Enviá un video con el comando o responde a un video que tenga audio 🤔`
      );
    }

    const { body, media } = source;
    let inputPath;
    let audioPath;

    await ctx.react('⏳');

    try {
      const video = await downloadVideo(ctx, body, media);
      if (video.length < 32) throw new Error('El video descargado está vacío.');

      inputPath = runtimePath('s2-video', 'mp4');
      audioPath = runtimePath('s2-audio', 'opus');

      await writeFile(inputPath, video);

      try {
        await runFfmpeg(inputPath, audioPath);
      } catch (error) {
        const details = `${error?.message || ''}\n${error?.stderr || ''}`;
        if (/matches no streams|stream map.*matches no streams|output file #0 does not contain any stream/i.test(details)) {
          await ctx.react('⚠️');
          return ctx.reply(
            `『 ⚠️ 』 *VIDEO SIN AUDIO*\n\n` +
            `> Ese video no tiene sonido, así que no puedo crear el sticker con audio 😅\n` +
            `> Mandá un video que sí tenga audio.`
          );
        }
        throw error;
      }

      const audio = await readFile(audioPath);
      if (!audio.length) throw new Error('No se pudo extraer el audio.');

      const user = await ctx.getUser();
      const userName = user?.name || user?.nickname || 'Usuario';

      // El sticker se convierte desde el video; el audio se envía como nota de voz aparte.
      const sticker = await stickerFromBuffer(video, {
        isVideo: true,
        userName
      });

      const sentSticker = await ctx.sock.sendMessage(
        ctx.chat,
        { sticker },
        { quoted: ctx.rawMsg }
      );

      await ctx.sock.sendMessage(
        ctx.chat,
        {
          audio,
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true
        },
        { quoted: sentSticker || ctx.rawMsg }
      );

      await ctx.react('✅');
    } catch (error) {
      console.error(`[s2] Error: ${error?.stack || error}`);
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL CREAR STICKER CON AUDIO*\n\n` +
        `> No pude procesar ese video 😵‍💫\n` +
        `> Verificá que sea válido y que el servidor tenga FFmpeg instalado.`
      );
    } finally {
      if (inputPath) await unlink(inputPath).catch(() => {});
      if (audioPath) await unlink(audioPath).catch(() => {});
    }
  });