import ytsearch from "yt-search"
import { getBuffer } from "#serialize"
import fetch from "node-fetch"

export default {
  command: ["play", "mp3", "ytmp3", "ytaudio", "playaudio"],
  category: "downloader",
  run: async ({ msg, sock, args }) => {
    try {
      if (!args || !args[0]) {
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

      let audioUrl = null
      const api = global.api || {}

      // --- INTENTO 1: Tu API ---
      try {
        if (api?.url && api?.key) {
          const dlEndpoint = `${api.url.replace(/\/+$/, "")}/dl/ytmp3?url=${encodeURIComponent(url)}&key=${api.key}`
          const resDl = await fetch(dlEndpoint).then(r => r.json())
          audioUrl = resDl?.data?.dl || resDl?.result?.dl || resDl?.dl
          console.log("[play] api principal:", audioUrl ? "ok" : "falló")
        }
      } catch (e) {
        console.log("[play] API principal falló:", e.message)
      }

      // --- INTENTO 2: API Espejo (arreglada) ---
      if (!audioUrl) {
        try {
          // vreden arreglada
          const mirrorRes = await fetch(`https://vreden.web.id/api/ytmp3?url=${encodeURIComponent(url)}`).then(r => r.json())
          audioUrl = mirrorRes?.result?.download?.url || mirrorRes?.data?.url || mirrorRes?.result?.dl
          console.log("[play] espejo vreden:", audioUrl ? "ok" : "falló")
        } catch (e) {
          console.log("[play] Espejo falló:", e.message)
        }
      }

      // --- INTENTO 3: Otro espejo público ---
      if (!audioUrl) {
        try {
          const res = await fetch(`https://api.agatz.xyz/api/ytmp3?url=${encodeURIComponent(url)}`).then(r => r.json())
          audioUrl = res?.data?.downloadUrl || res?.data?.url
        } catch {}
      }

      if (!audioUrl) {
        return msg.reply("《✧》 No se pudo descargar el *audio* de ningún servidor, intenta más tarde.")
      }

      // FIX: mandar como audio/mpeg y ptt: false para que sea música
      await sock.sendMessage(msg.chat, {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg',
        ptt: false,
        fileName: `${title}.mp3`
      }, { quoted: msg })

    } catch (e) {
      console.error(e)
      await msg.reply("《✧》 Ocurrió un error inesperado al procesar la solicitud.")
    }
  }
}