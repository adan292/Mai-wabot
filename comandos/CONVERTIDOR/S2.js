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
    『 ⚠️ 』 *VIDEO SIN AUDIO*\n\n +
    '> Ese video no tiene sonido, por eso no puedo hacer un sticker con sonido 😅\n' +
    '> Mandá un video que sí tenga audio.'
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

// ✅ FIX: Use || for fallbacks and ensure proper concatenation
const userName = user?.name || user?.nickname || 'Usuario';

// ✅ FIX: Pass 'audio' buffer to stickerFromBuffer, not 'buffer'
const sticker = await stickerFromBuffer(audio, { isVideo: true, userName });

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