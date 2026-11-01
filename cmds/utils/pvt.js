import axios from 'axios';

export default {
  command: ['pvt'],
  category: 'utils',
  description: 'Convierte un video en nota de video',
  run: async ({ msg, sock, args }) => {
    try {
      const text = args?.join(' ') || msg.text || '';
      let videoBuffer;

      // 1. Si responde a un video
      if (msg.quoted) {
        const q = msg.quoted;
        const mtype = q.mtype || q.type || '';
        if (mtype.includes('video') || mtype.includes('document')) {
          videoBuffer = await q.download();
        }
      } 
      // 2. Si es link directo
      else if (text && /^https?:\/\//i.test(text.trim())) {
        const res = await axios.get(text.trim(), {
          responseType: 'arraybuffer',
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        videoBuffer = Buffer.from(res.data);
      }

      if (!videoBuffer) {
        return msg.reply('Ay Senpai, responde a un video o manda un link directo de video. 🐰');
      }

      if (!Buffer.isBuffer(videoBuffer) || videoBuffer.length < 100) {
        return msg.reply('No pude obtener el video, Senpai.');
      }

      // ESTA ES LA CLAVE
      await sock.sendMessage(
        msg.chat,
        {
          video: videoBuffer,
          mimetype: 'video/mp4',
          ptv: true, // <- esto lo hace nota de video
          gifPlayback: false
        },
        { quoted: msg }
      );

    } catch (e) {
      console.error('[PVT ERROR]', e);
      return msg.reply(`Ay... no pude convertirlo, Senpai.\nError: ${e.message}`);
    }
  }
};