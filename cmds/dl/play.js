import ytsearch from "yt-search"
import { getBuffer } from "#serialize"
import fetch from "node-fetch"

// ⚠️ RECUERDA: Configura aquí las credenciales de tu API si no las importas de un archivo global
const api = {
  url: "TU_API_URL_AQUI", 
  key: "TU_API_KEY_AQUI"
}

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
      const thumbBuffer = await getBuffer(image)

      const caption = `【　✿　】 _\`୨୧  Download\` ───── *${title}*_

> _✐ \`Canal\` ── ${canal}_
> _ⴵ \`Duración\` ── ${duration || ''}_
> _✰ \`Vistas\` ── ${vistas}_
> _🜸 \`Enlace\` ── ${url}_

> _──  ִ    ۟  *¡Enviando audio, por favor espera!*_`

      await sock.sendMessage(msg.chat, { image: thumbBuffer, caption }, { quoted: msg })

      const dlEndpoint = `${api.url}/dl/ytmp3?url=${encodeURIComponent(url)}&key=${api.key}`
      const resDl = await fetch(dlEndpoint).then(r => r.json())
      
      // Validación estricta de la respuesta de la API
      if (!resDl || !resDl.status || !resDl.data?.dl) {
        return msg.reply("《✧》 No se pudo descargar el *audio*, intenta más tarde o revisa la API.")
      }

      // Enviamos el audio descargándolo directamente desde la URL devuelta por la API (más óptimo)
      const mensaje = {
        audio: { url: resDl.data.dl },
        mimetype: 'audio/mp4', // Cambiado a audio/mp4 para mejor compatibilidad con ptt: true (Nota de voz)
        fileName: `${title}.mp3`,
        ptt: true
      }

      await sock.sendMessage(msg.chat, mensaje, { quoted: msg })
    } catch (e) {
      console.error(e) // Añadido para que puedas ver el error exacto en tu consola si vuelve a fallar
      await msg.reply("《✧》 Ocurrió un error inesperado al procesar la solicitud.")
    }
  }
}
