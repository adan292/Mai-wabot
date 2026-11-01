import ytsearch from "yt-search"
import fetch from "node-fetch"

// Si tu base tiene getBuffer en #serialize úsalo, si no usa este
let getBuffer
try {
  const mod = await import("#serialize")
  getBuffer = mod.getBuffer
} catch {
  getBuffer = async (url) => {
    const res = await fetch(url)
    return Buffer.from(await res.arrayBuffer())
  }
}

export default {
  command: ["play", "mp3", "ytmp3", "ytaudio", "playaudio"],
  category: "downloader",
  desc: "Descarga audio de YouTube",
  run: async ({ msg, sock, args }) => {
    try {
      if (!args[0]) {
        return msg.reply("《✧》Por favor, menciona el nombre o URL del video que deseas descargar")
      }

      const text = args.join(" ")
      await sock.sendMessage(msg.chat, { react: { text: '🕒', key: msg.key } })

      // Si el argumento ya es un enlace de YouTube, lo usamos directamente. Si no, buscamos.
      let videoUrl = ""
      let title = ""
      let duration = ""
      let vistas = "0"
      let canal = "Desconocido"
      let image = ""

      if (text.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)) {
        videoUrl = text
        const searchResult = await ytsearch({ videoId: text.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)[1] })
        if (searchResult) {
          title = searchResult.title
          duration = searchResult.duration?.timestamp || ""
          vistas = (searchResult.views || 0).toLocaleString()
          canal = searchResult.author?.name || "Desconocido"
          image = searchResult.image || searchResult.thumbnail || ""
        } else {
          title = "Video de YouTube"
        }
      } else {
        const searchResult = await ytsearch(text)
        if (!searchResult.videos?.length) {
          await sock.sendMessage(msg.chat, { react: { text: '✖️', key: msg.key } })
          return msg.reply("《✧》 No se encontró información del video.")
        }
        const video = searchResult.videos[0]
        videoUrl = video.url
        title = video.title
        duration = video.timestamp || ""
        vistas = (video.views || 0).toLocaleString()
        canal = video.author?.name || video.author || "Desconocido"
        image = video.image || video.thumbnail || ""
      }

      let thumbBuffer
      if (image) {
        try { thumbBuffer = await getBuffer(image) } catch { thumbBuffer = null }
      }

      const caption = `【　✿　】 _\`୨୧  Download\` ───── *${title}*_

> _✐ \`Canal\` ── ${canal}_
> _ⴵ \`Duración\` ── ${duration || ''}_
> _✰ \`Vistas\` ── ${vistas}_
> _🜸 \`Enlace\` ── ${videoUrl}_

> _──  ִ    ۟  *¡Enviando audio, por favor espera!*_`

      if (thumbBuffer) {
        await sock.sendMessage(msg.chat, { image: thumbBuffer, caption }, { quoted: msg })
      } else {
        await msg.reply(caption)
      }

      // --- SISTEMA DE DESCARGA CON URL ENCONTRADO ---
      const APIS = [
        {
          name: 'AlyaCore',
          url: `https://api.alyacore.xyz/dl/ytmp3?url=${encodeURIComponent(videoUrl)}`,
          extractor: (json) => json?.data?.dl || json?.result?.dl || json?.dl || json?.data?.download_url
        },
        {
          name: 'ZenzzXD',
          url: `https://api.zenzxz.my.id/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`,
          extractor: (json) => json?.data?.download_url || json?.download_url
        },
        {
          name: 'Vreden',
          url: `https://api.vreden.my.id/api/v1/download/youtube/audio?url=${encodeURIComponent(videoUrl)}&quality=128`,
          extractor: (json) => json?.result?.download?.url
        }
      ]

      let dlUrl = null
      let apiUsada = ''

      for (const api of APIS) {
        try {
          console.log(`[PLAY] Probando ${api.name}: ${api.url}`)
          const res = await fetch(api.url, { 
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(15000)
          }).then(r => r.json())
          
          const link = api.extractor(res)
          if (link && link.startsWith('http')) {
            dlUrl = link
            apiUsada = api.name
            break
          }
        } catch (e) {
          console.log(`[PLAY] ${api.name} falló: ${e.message}`)
        }
      }

      if (!dlUrl) {
        return msg.reply("《✧》 No se pudo descargar el *audio* de ningún servidor, intenta más tarde.")
      }

      const audioRes = await fetch(dlUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!audioRes.ok) throw new Error(`Servidor ${apiUsada} devolvió ${audioRes.status}`)
      
      const audioBuffer = Buffer.from(await audioRes.arrayBuffer())
      if (audioBuffer.length < 1000) throw new Error('Archivo vacío o corrupto')

      console.log(`[PLAY] Audio descargado de ${apiUsada}: ${audioBuffer.length} bytes`)

      await sock.sendMessage(msg.chat, {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
        ptt: false
      }, { quoted: msg })

      await sock.sendMessage(msg.chat, { react: { text: '✔️', key: msg.key } })

    } catch (e) {
      console.error('[PLAY ERROR]', e)
      await sock.sendMessage(msg.chat, { react: { text: '✖️', key: msg.key } })
      await msg.reply(`《✧》Error: ${e.message}\n\nAvisa a adánzx7`)
    }
  }
}
