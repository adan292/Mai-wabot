import { randomUUID } from 'crypto';
import { readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { ZenCommand } from '../../lib/core/factory.js';
import { stickerFromBuffer } from '../../lib/media/sticker.js';

const MAX_SECONDS = 20;

function unwrap(message) {
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
}

function getQuotedMessage(message) {
  for (const value of Object.values(unwrap(message))) {
    if (value && typeof value === 'object' && value.contextInfo?.quotedMessage) {
      return value.contextInfo.quotedMessage;
    }
  }
  return null;
}

function runProcess(command, args, timeout = 60000) {
  return new Promise((resolve, reject) => {
    let output = '';
    let errorOutput = '';
    const proc = spawn(command, args);
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`${command} excedió el tiempo límite`));
    }, timeout);

    proc.stdout?.on('data', (chunk) => { output += chunk.toString(); });
    proc.stderr?.on('data', (chunk) => { errorOutput += chunk.toString(); });
    proc.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve(output.trim());
      reject(new Error(`${command} falló: ${errorOutput.slice(-500)}`));
    });
  });
}

export default new ZenCommand('s2')
  .setCooldown(5)
  .setCategory('convertidores')
  .requireRegistration()
  .setUsage('(responder a un video de hasta 20 segundos)')
  .onExecute(async (ctx) => {
    const quoted = getQuotedMessage(ctx.rawMsg.message);
    const source = quoted ? unwrap(quoted) : null;
    const mediaMsg = source?.videoMessage;

    if (!mediaMsg) {
      await ctx.react('⚠️');
      return ctx.reply(
        `『 ⚠️ 』 *VIDEO REQUERIDO*\n\n` +
        `> Respondé a un video de hasta 20 segundos con *${ctx.commandName}* para crear el sticker con sonido 🤔`
      );
    }

    const id = randomUUID();
    const inputPath = path.join(tmpdir(), `s2_${id}.mp4`);
    const audioPath = path.join(tmpdir(), `s2_${id}.opus`);

    await ctx.react('⏳');
    try {
      let buffer;
      try {
        buffer = Buffer.from(await ctx.sock.downloadMedia(source, 'video'));
      } catch (downloadError) {
        const fallback = await import('../../lib/media/sticker.js')
          .then(({ downloadMediaBuffer }) => downloadMediaBuffer(ctx.sock, { key: ctx.rawMsg.key, message: source }));
        if (!fallback) throw downloadError;
        buffer = Buffer.from(fallback);
      }

      if (!buffer || buffer.length < 32) throw new Error('video vacío');
      await writeFile(inputPath, buffer);

      let seconds = Number(mediaMsg.seconds) || 0;
      if (!seconds) {
        const duration = await runProcess('ffprobe', [
          '-v', 'error',
          '-show_entries', 'format=duration',
          '-of', 'default=noprint_wrappers=1:nokey=1',
          inputPath
        ], 15000);
        seconds = Number(duration);
      }

      if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('duración de video inválida');
      if (seconds > MAX_SECONDS) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *VIDEO MUY LARGO*\n\n` +
          `> El video debe durar como máximo ${MAX_SECONDS} segundos 😄`
        );
      }

      // Verificar si el video tiene pista de audio
      let hasAudio = false;
      try {
        const probe = await runProcess('ffprobe', [
          '-v', 'error',
          '-select_streams', 'a:0',
          '-show_entries', 'stream=codec_type',
          '-of', 'csv=p=0',
          inputPath
        ], 15000);
        hasAudio = Boolean(probe.trim());
      } catch {
        hasAudio = false;
      }

      if (!hasAudio) {
        await ctx.react('⚠️');
        return ctx.reply(
          `『 ⚠️ 』 *VIDEO SIN AUDIO*\n\n` +
          `> Ese video no tiene sonido, por eso no puedo hacer un sticker con sonido 😅\n` +
          `> Mandá un video que sí tenga audio.`
        );
      }

      // Extraer el audio en formato OPUS compatible con WhatsApp
      await runProcess('ffmpeg', [
        '-y',
        '-t', String(MAX_SECONDS),
        '-i', inputPath,
        '-vn',
        '-map', '0:a:0',
        '-c:a', 'libopus',
        '-b:a', '48k',
        '-ar', '48000',
        '-ac', '1',
        audioPath
      ]);

      const audio = await readFile(audioPath);
      const user = await ctx.getUser();
      const userName = user.name || user.nickname || 'Usuario';
      const sticker = await stickerFromBuffer(buffer, { isVideo: true, userName });

      // 1. Enviar el sticker animado
      const sentSticker = await ctx.sock.sendMessage(
        ctx.chat,
        { sticker },
        { quoted: ctx.rawMsg }
      );

      // 2. Enviar el audio respondiendo al sticker recién enviado
      await ctx.sock.sendMessage(
        ctx.chat,
        {
          audio,
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true // Cambia a false si prefieres archivo de audio en lugar de nota de voz
        },
        { quoted: sentSticker || ctx.rawMsg }
      );

      await ctx.react('✅');
    } catch (error) {
      console.error(`[s2] Error: ${error?.message || error}`);
      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ERROR AL CREAR STICKER CON SONIDO*\n\n` +
        `> No pude procesar el video. Verificá que dure ${MAX_SECONDS} segundos o menos y que tenga audio 😵‍💫`
      );
    } finally {
      await rm(inputPath, { force: true }).catch(() => {});
      await rm(audioPath, { force: true }).catch(() => {});
    }
  });
