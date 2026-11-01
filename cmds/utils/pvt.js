import axios from 'axios';

export default {
  command: ['pvt'],
  category: 'utils',
  description: 'Convierte un video en nota de video',
  run: async ({ msg, sock, text }) => {
    try {
      let videoBuffer;

      if (msg.quoted && (msg.quoted.mtype === 'videoMessage' || msg.quoted.type === 'videoMessage')) {
        videoBuffer = await msg.quoted.download();
      } else if (text && /^https?:\/\//i.test(text.trim())) {
        const res = await axios.get(text.trim(), {
          responseType: 'arraybuffer',
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        videoBuffer = Buffer.from(res.data);
      } else {
        return msg.reply('Responde a un video o envía un enlace directo de video para convertirlo en nota de video.');
      }

      if (!Buffer.isBuffer(videoBuffer) || videoBuffer.length < 100) {
        return msg.reply('No pude obtener el video para convertirlo.');
      }

      await sock.sendMessage(
        msg.chat,
        {
          video: videoBuffer,
          mimetype: 'video/mp4',
          caption: '',
          gifPlayback: false
        },
        { quoted: msg }
      );

      return;
    } catch (e) {
      console.error(e);
      return msg.reply('No pude convertir el video en nota de video.');
    }
  }
};