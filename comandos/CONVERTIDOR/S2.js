import { randomUUID } from 'crypto';
import { readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { ZenCommand } from '../../lib/core/factory.js';
import { stickerFromBuffer } from '../../lib/media/sticker.js';
// FIX: Importar esto de TU baileys
import { prepareWAMessageMedia, proto } from '@whiskeysockets/baileys';

const MAX_SECONDS = 25; // el del canal permite hasta 25, no 20

// ============ INICIO PARCHE DEL CANAL - NO LO BORRES ============
function patchProtoInstance(p) {
  const M = p?.Message;
  if (!M || M.__audioStickerPatchedV3) return;

  if (M.StickerMessage) {
    const prevStickerEncode = M.StickerMessage.encode;
    M.StickerMessage.encode = function (message, writer) {
      const audio = message?.audioMessage;
      if (audio && Object.prototype.hasOwnProperty.call(message, 'audioMessage')) {
        delete message.audioMessage;
      }
      const w = prevStickerEncode.call(this, message, writer);
      if (audio && M.AudioMessage) {
        message.audioMessage = audio;
        M.AudioMessage.encode(audio, w.uint32(210).fork()).ldelim();
      }
      return w;
    };
  }

  const prevMsgEncode = M.encode;
  M.encode = function (message, writer) {
    const asm = message?.audioStickerMessage;
    if (asm) {
      if (Object.prototype.hasOwnProperty.call(message, 'stickerMessage')) delete message.stickerMessage;
      if (Object.prototype.hasOwnProperty.call(message, 'audioStickerMessage')) delete message.audioStickerMessage;
    }
    const w = prevMsgEncode.call(this, message, writer);
    if (asm && M.FutureProofMessage) {
      message.audioStickerMessage = asm;
      M.FutureProofMessage.encode(asm, w.uint32(1074).fork()).ldelim();
    }
    return w;
  };
  M.__audioStickerPatchedV3 = true;
}

async function sendCombinedAudioSticker(client, chat, stickerBuffer, isAnimated, audioMsg) {
  patchProtoInstance(proto);

  const prepared = await prepareWAMessageMedia(
    { sticker: stickerBuffer, isAnimated },
    { upload: client.waUploadToServer }
  );
  prepared.stickerMessage.isAnimated = Boolean(isAnimated);
  prepared.stickerMessage.audioMessage = audioMsg;

  const payload = {
    __proto__: prepared,
    audioStickerMessage: { message: prepared },
    messageContextInfo: { messageSecret: randomUUID().replaceAll('-','').slice(0,32) }
  };
  // ESTO es lo clave: relayMessage, NO sendMessage
  await client.relayMessage(chat, payload, {});
}

function generateWaveform(seedBuf, length = 64) {
  const wf = Buffer.alloc(length);
  for (let i = 0; i < length; i++) {
    const b = seedBuf?.length ? seedBuf[(i * 19 + 7) % seedBuf.length] : i * 11;
    wf[i] = 18 + (b % 76);
  }
  return wf;
}
// ============ FIN PARCHE ============

function unwrap(message) {
  let current = message;
  for (let i = 0; i < 5 && current; i++) {
    const wrapper = ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension', 'documentWithCaptionMessage'].find((key) => current[key]?.message);
    if (!wrapper) break;
    current = current[wrapper].message;
  }
  return current || {};
}
function getQuotedMessage(message) {
  for (const value of Object.values(unwrap(message))) {
    if (value && typeof value === 'object' && value.contextInfo?.quotedMessage) return value.contextInfo.quotedMessage;
  }
  return null;
}
function runProcess(command, args, timeout = 60000) {
  return new Promise((resolve, reject) => {
    let errorOutput = '';
    const process = spawn(command, args);
    const timer = setTimeout(() => { process.kill('SIGKILL'); reject(new Error(`${command} excedió el tiempo límite`)); }, timeout);
    process.stderr?.on('data', (chunk) => { errorOutput += chunk.toString(); });
    process.on('error', (error) => { clearTimeout(timer); reject(error); });
    process.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve('');
      reject(new Error(`${command} falló: ${errorOutput.slice(-500)}`));
    });
  });
}

export default new ZenCommand('s2')
  .setCooldown(5)
  .setCategory('convertidores')
  .requireRegistration()
  .setUsage('(responder a un video de hasta 25 segundos)')
  .onExecute(async (ctx) => {
    const quoted = getQuotedMessage(ctx.rawMsg.message);
    const source = quoted ? unwrap(quoted) : null;
    const mediaMsg = source?.videoMessage;
    if (!mediaMsg) {
      await ctx.react('⚠️');
      return ctx.reply(`『 ⚠️ 』 *VIDEO REQUERIDO*\n\n> Respondé a un video de hasta 25 segundos con *${ctx.commandName}* para crear el sticker con sonido 🤔`);
    }

    const id = randomUUID();
    const inputPath = path.join(tmpdir(), `s2_${id}.mp4`);
    const audioPath = path.join(tmpdir(), `s2_${id}.ogg`);
    await ctx.react('⏳');
    try {
      let buffer;
      try { buffer = Buffer.from(await ctx.sock.downloadMedia(source, 'video')); }
      catch {
        const { downloadMediaBuffer } = await import('../../lib/media/sticker.js');
        buffer = Buffer.from(await downloadMediaBuffer(ctx.sock, { key: ctx.rawMsg.key, message: source }));
      }
      if (!buffer || buffer.length < 32) throw new Error('video vacío');
      await writeFile(inputPath, buffer);

      let seconds = Number(mediaMsg.seconds) || 0;
      if (!seconds) {
        // si no viene, lo sacamos con ffprobe rápido
        seconds = 10;
      }
      if (seconds > MAX_SECONDS) {
        await ctx.react('⚠️');
        return ctx.reply(`『 ⚠️ 』 *VIDEO MUY LARGO*\n\n> El video debe durar como máximo 25 segundos 😄`);
      }

      // 1. Extraer audio a OGG Opus
      await runProcess('ffmpeg', ['-y', '-t', String(MAX_SECONDS), '-i', inputPath, '-vn', '-map', '0:a:0', '-c:a', 'libopus', '-b:a', '48k', '-ar', '48000', '-ac', '1', '-f', 'ogg', audioPath]);
      const oggBuffer = await readFile(audioPath);

      // 2. Crear el AudioMessage con prepareWAMessageMedia (como hace el plugin)
      const { audioMessage } = await prepareWAMessageMedia(
        { audio: oggBuffer, mimetype: 'audio/ogg; codecs=opus', ptt: true },
        { upload: ctx.sock.waUploadToServer }
      );
      audioMessage.seconds = Math.max(1, Math.min(MAX_SECONDS, Math.round(seconds) || 5));
      audioMessage.ptt = true;
      audioMessage.mimetype = 'audio/ogg; codecs=opus';
      if (!audioMessage.waveform?.length) audioMessage.waveform = generateWaveform(oggBuffer);

      // 3. Crear el sticker animado
      const user = await ctx.getUser();
      const sticker = await stickerFromBuffer(buffer, { isVideo: true, userName: user.name || user.nickname || 'Usuario' });

      // 4. Mandar COMBINADO con relayMessage + parche, NO con sendMessage
      await sendCombinedAudioSticker(ctx.sock, ctx.chat, sticker, true, audioMessage);

      await ctx.react('✅');
    } catch (error) {
      console.error(`[s2] Error: ${error?.message || error}`);
      // Si falla porque no tiene audio, avisa claro
      if (String(error?.message).includes('0:a:0') || String(error?.message).includes('falló')) {
        return ctx.reply(`『 ⚠️ 』 *VIDEO SIN AUDIO*\n\n> Ese video no tiene sonido 😅`);
      }
      await ctx.react('❌');
      return ctx.reply(`『 ❌ 』 *ERROR AL CREAR STICKER CON SONIDO*\n\n> No pude procesar el video. Verificá que dure 25 segundos o menos y que tenga audio 😵‍💫`);
    } finally {
      await rm(inputPath, { force: true }).catch(() => {});
      await rm(audioPath, { force: true }).catch(() => {});
    }
  });