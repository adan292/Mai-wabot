import ytsearch from "yt-search"
import ytdl from "@distube/ytdl-core"

export default {
  command: ["play", "mp3", "ytmp3", "ytaudio", "playaudio"],
  category: "downloader",
  run: async ({ msg, sock, args }) => {

    try {
      if (!args || !args.length) {
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

      const caption = `【　✿　】 _\`୨୧  Download\` ───── *${title}*_

> _✐ \`Canal\` ── ${canal}_
> _ⴵ \`Duración\` ── ${duration || ''}_
> _✰ \`Vistas\` ── ${vistas}_
> _🜸 \`Enlace\` ── ${url}_

> _──  ִ    ۟  *¡Generando y enviando audio localmente, por favor espera!*_`

      // Enviamos la miniatura usando directamente la URL de la imagen en lugar de getBuffer para evitar fallos de red
      await sock.sendMessage(msg.chat, { image: { url: image }, caption }, { quoted: msg })

      // Descarga directa del flujo de audio en alta calidad (128kbps / audioonly)
      const stream = ytdl(url, { 
        filter: 'audioonly', 
        quality: 'highestaudio',
        highWaterMark: 1 << 25 // Buffer de 32MB para descargas rápidas y fluidas
      })

      const chunks = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }
      const audioBuffer = Buffer.concat(chunks)

      // Configuración del mensaje para WhatsApp de forma nativa
      const mensaje = {
        audio: audioBuffer,
        mimetype: 'audio/mp4', 
        fileName: `${title}.mp3`,
        ptt: true // Cambia a false si prefieres que se envíe como archivo de música y no nota de voz
      }

      await sock.sendMessage(msg.chat, mensaje, { quoted: msg })

    } catch (e) {
      console.error("Error en el comando play:", e)
      
      // Mensaje de diagnóstico amigable en el chat en caso de que YouTube aplique restricciones de IP
      if (e.message.includes('403') || e.message.includes('Sign in')) {
        await msg.reply("《✧》 YouTube ha bloqueado temporalmente la IP del servidor. Intenta de nuevo en unos minutos.")
      } else {
        await msg.reply("《✧》 Ocurrió un error local al procesar el audio.")
      }
    }
  }
}
