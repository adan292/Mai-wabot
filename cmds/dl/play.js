import ytsearch from "yt-search"
import { getBuffer } from "#serialize"
import fetch from "node-fetch"
// ⚠️ Asegúrate de importar tu configuración donde guardas la URL y KEY de la API
// Ejemplo: import config from "../config.js" 

export default {
  command: ["play", "mp3", "ytmp3", "ytaudio", "playaudio"],
  category: "downloader",
  run: async ({ msg, sock, args }) => {

    try {
      if (!args[0]) {
        return msg.reply("《✧》Por favor, menciona el nombre o URL del video que deseas descargar.")
      }

      const text = args.join(" ")
      const searchResult = await ytsearch(text)
      if (!searchResult.videos || !searchResult.videos.length) {
        return msg.reply("《✧》 No se encontró información del video.")
      }

      const video = searchResult.videos[0]
      const { title, author, timestamp: duration, views, url, image } = video
      const vistas = (views || 0).toLocaleString()
      const canal = author?.name || author || "Desconocido"
      
      // Intentar obtener la miniatura de forma segura
      let thumbBuffer;
      try {
        thumbBuffer = await getBuffer(image)
      } catch {
        thumbBuffer = null // Si falla la imagen, que no rompa el comando
      }

      const caption = `【　✿　】 _\`୨୧  Download\` ───── *${title}*_

> _✐ \`Canal\` ── ${canal}_
> _ⴵ \`Duración\` ── ${duration || ''}_
> _✰ \`Vistas\` ── ${vistas}_
> _🜸 \`Enlace\` ── ${url}_

> _──  ִ    ۟  *¡Enviando audio, por favor espera!*_`

      // Si hay miniatura se envía, si no, se envía solo el texto
      if (thumbBuffer) {
        await sock.sendMessage(msg.chat, { image: thumbBuffer, caption }, { quoted: msg })
      } else {
        await msg.reply(caption)
      }

      // ⚠️ REEMPLAZA 'global.api' por la ruta real de tu objeto de APIs configurado
      const apiUrl = global.api?.url || "https://tu-api.com"
      const apiKey = global.api?.key || "tu_key"

      const dlEndpoint = `${apiUrl}/dl/ytmp3?url=${encodeURIComponent(url)}&key=${apiKey}`
      const resDl = await fetch(dlEndpoint).then(r => r.json())
      
      if (!resDl?.status || !resDl.data?.dl) {
        return msg.reply("《✧》 No se pudo descargar el *audio*, intenta más tarde.")
      }

      const audioBuffer = await getBuffer(resDl.data.dl)

      const mensaje = {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        fileName: resDl.data.fileName || `${title}.mp3`
      }

      await sock.sendMessage(msg.chat, mensaje, { quoted: msg })
    } catch (e) {
      console.error(e) // Es buena práctica imprimir el error en consola para debuguear
      // Reemplazado 'msgglobal' por un string directo para evitar fallos de referencia
      await msg.reply(`⚠️ Ocurrió un error inesperado: ${e.message || e}`)
    }
  }
          }
    
