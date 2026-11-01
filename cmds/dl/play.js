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

      const searchResult = await ytsearch(text)
      if (!searchResult.videos?.length) {
        return msg.reply("《✧》 No se encontró información del video.")
      }

      const video = searchResult.videos[0]
      const { title, author, timestamp: duration, views, url, image } = video
      const vistas = (views || 0).toLocaleString()
      const canal = author?.name || author || "Desconocido"

      let thumbBuffer
      try { thumbBuffer = await getBuffer(image) } catch { thumbBuffer = null }

      const caption = `【　✿　】 _\`୨୧  Download\` ───── *${title}*_

> _✐ \`Canal\` ── ${canal}_
> _ⴵ \`Duración\` ── ${duration || ''}_
> _✰ \`Vistas\` ── ${vistas}_
> _🜸 \`Enlace\` ── ${url}_

> _──  ִ    ۟  *¡Enviando audio, por favor espera!*_`

      if (thumbBuffer) {
        await sock.sendMessage(msg.chat, { image: thumbBuffer, caption }, { quoted: msg })
      } else {
        await msg.reply(caption)
      }

      // --- SISTEMA DE DESCARGA ARREGLADO ---
      const APIS = [
        // Tu API principal
        {
          name: 'AlyaCore',
          url: `https://api.alyacore.xyz/dl/ytmp3?url=${encodeURIComponent(url)}`,
          extractor: (json) => json?.data?.dl || json?.result?.dl || json?.dl || json?.data?.download_url
        },
        // Fallbacks por si falla
        {
          name: 'ZenzzXD',
          url: `https://api.zenzxz.my.id/downloader/ytmp3?url=${encodeURIComponent(url)}`,
          extractor: (json) => json?.data?.download_url || json?.download_url
        },
        {
          name: 'Vreden',
          url: `https://api.vreden.my.id/api/v1/download/youtube/audio?url=${encodeURIComponent(url)}&quality=128`,
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

      // FIX CLAVE: descargar buffer con headers
      const audioRes = await fetch(dlUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!audioRes.ok) throw new Error(`Servidor ${apiUsada} devolvió ${audioRes.status}`)
      
      const audioBuffer = Buffer.from(await audioRes.arrayBuffer())
      if (audioBuffer.length < 1000) throw new Error('Archivo vacío')

      console.log(`[PLAY] Audio descargado de ${apiUsada}: ${audioBuffer.length} bytes`)

      await sock.sendMessage(msg.chat, {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
        ptt: false // ponlo en true si lo quieres como nota de voz
      }, { quoted: msg })

      await sock.sendMessage(msg.chat, { react: { text: '✔️', key: msg.key } })

    } catch (e) {
      console.error('[PLAY ERROR]', e)
      await sock.sendMessage(msg.chat, { react: { text: '✖️', key: msg.key } })
      await msg.reply(`《✧》Error: ${e.message}\n\nAvisa a adánzx7`)
    }
  }
}