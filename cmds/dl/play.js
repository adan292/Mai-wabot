import ytsearch from "yt-search"
import { getBuffer } from "#serialize"
import fetch from "node-fetch"

// Configura aquí las credenciales de tu API externa si no las tienes globales
const API_URL = "TU_URL_DE_LA_API" 
const API_KEY = "TU_KEY_DE_LA_API"

export default {
  command: ["play", "mp3", "ytmp3", "ytaudio", "playaudio"],
  category: "downloader",
  run: async ({ msg, sock, args }) => {

    try {
      if (!args[0]) {
        return msg.reply("《✧》Por favor, menciona el nombre o URL del video que deseas descargar")
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
      
      // Intentar obtener la miniatura, si falla, continúa sin romper el comando
      let thumbBuffer
      try {
        thumbBuffer = await getBuffer(image)
      } catch {
        thumbBuffer = null
      }

      const caption = `【　✿　】 _\`୨୧  Download\` ───── *${title}*_

> _✐ \`Canal\` ── ${canal}_
> _ⴵ \`Duración\` ── ${duration || ''}_
> _✰ \`Vistas\` ── ${vistas}_
> _🜸 \`Enlace\` ── ${url}_

> _──  ִ    ۟  *¡Enviando audio, por favor espera!*_`

      // Si hay miniatura envía imagen, si no, envía solo el texto para evitar caídas
      if (thumbBuffer) {
        await sock.sendMessage(msg.chat, { image: thumbBuffer, caption }, { quoted: msg })
      } else {
        await msg.reply(caption)
      }

      // Corrección de las variables de la API
      const dlEndpoint = `${API_URL}/dl/ytmp3?url=${encodeURIComponent(url)}&key=${API_KEY}`
      const resDl = await fetch(dlEndpoint).then(r => r.json())
      
      if (!resDl?.status || !resDl?.data?.dl) {
        return msg.reply("《✧》 No se pudo descargar el *audio*, intenta más tarde.")
      }

      const audioBuffer = await getBuffer(resDl.data.dl)

      const mensaje = {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
        ptt: false // Cambiado a false si quieres que se envíe como música, true si quieres que parezca nota de voz
      }

      await sock.sendMessage(msg.chat, mensaje, { quoted: msg })
    } catch (e) {
      console.error(e) // Imprime el error real en la consola para que puedas auditarlo
      await msg.reply("《✧》 Ocurrió un error inesperado al procesar el comando.")
    }
  }
      }
      
