import db from "#db"
import ytsearch from "yt-search"
import sharp from "sharp"
import axios from "axios"

async function fetchBuffer(url) {
  try {
    const res = await axios.get(url, { 
      responseType: "arraybuffer", 
      timeout: 60000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    return Buffer.from(res.data)
  } catch (e) {
    console.log(`[fetchBuffer] fail ${url}: ${e.message}`)
    return null
  }
}

function formatSize(mb) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  return `${mb.toFixed(2)} MB`
}

function isValidAudio(buf) {
  if (!buf || buf.length < 3000) return false
  const str = buf.slice(0, 800).toString().toLowerCase()
  if (str.includes('<html') || str.includes('<!doctype') || str.includes('error') || str.includes('cloudflare')) return false
  return true
}

function isYoutubeUrl(t) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com)\/.+/i.test(t)
}

export default {
  command: ["play", "mp3", "ytmp3", "ytaudio", "playaudio"],
  category: "downloader",
  run: async ({ msg, sock, args, command }) => {
    try {
      if (!args[0]) return msg.reply("《✧》 Por favor, menciona el nombre o URL del video.")

      const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net'
      const settings = (await db.getSettings(botId)) || {}
      const botOfc = global?.sock?.user?.id?.split(':')[0] + '@s.whatsapp.net' || ''
      const isOficialBot = botId === botOfc
      const maxSize = isOficialBot ? 5120 : Number(settings.botmod) === 1 ? 3072 : Number(settings.botprem) === 1 ? 2048 : 100

      const api = global.api || globalThis.api
      if (!api?.url || !api?.key) return msg.reply("《✧》 La API no está configurada.")

      const text = args.join(" ").trim()
      let video

      if (isYoutubeUrl(text)) {
        const r = await ytsearch(text)
        video = r?.videos?.[0] || { url: text, title: "audio", author: { name: "YouTube" }, timestamp: "", views: 0, seconds: 0, image: "" }
      } else {
        const r = await ytsearch(text)
        if (!r?.videos?.length) return msg.reply("《✧》 No se encontró información.")
        video = r.videos[0]
      }

      const { author, timestamp: duration, views, url, image, seconds } = video
      const title = video.title || "audio"
      const canal = author?.name || author || "Desconocido"
      const vistas = (views || 0).toLocaleString()

      const estimatedMB = ((seconds || 0) * 128000) / 8 / (1024 * 1024)
      if (estimatedMB > maxSize) {
        return msg.reply(`《✧》 Pesa aprox *${formatSize(estimatedMB)}* y supera *${formatSize(maxSize)}*.`)
      }

      let thumbBuffer = null
      if (image) thumbBuffer = await fetchBuffer(image)

      const caption = `【　✿　】 _\`୨୧  Download\` ───── *${title}*_

> _✐ \`Canal\` ── ${canal}_
> _ⴵ \`Duración\` ── ${duration || ""}_
> _✰ \`Vistas\` ── ${vistas}_
> _🜸 \`Enlace\` ── ${url}_

> _──  ִ    ۟  *¡Enviando audio, por favor espera!*_`

      if (thumbBuffer) {
        await sock.sendMessage(msg.chat, { image: thumbBuffer, caption }, { quoted: msg }).catch(() => sock.sendMessage(msg.chat, { text: caption }, { quoted: msg }))
      } else {
        await sock.sendMessage(msg.chat, { text: caption }, { quoted: msg })
      }

      let audioBuffer = null
      let audioTitle = title
      const baseUrl = String(api.url).replace(/\/+$/, "")

      const endpoints = [
        { name: "v1", url: `${baseUrl}/dl/ytmp3?url=${encodeURIComponent(url)}&key=${api.key}` },
        { name: "v2", url: `${baseUrl}/dl/ytmp3v2?url=${encodeURIComponent(url)}&key=${api.key}` },
        { name: "v3", url: `${baseUrl}/dl/ytmp3v3?url=${encodeURIComponent(url)}&key=${api.key}` },
      ]

      for (const ep of endpoints) {
        if (audioBuffer) break
        try {
          const res = await axios.get(ep.url, { timeout: 20000 })
          console.log(`[play debug ${ep.name}]`, JSON.stringify(res.data).slice(0, 400))
          const dlUrl = res.data?.data?.dl || res.data?.result?.dl || res.data?.dl || res.data?.data?.url || res.data?.url
          if (!dlUrl) { console.log(`[play] ${ep.name} sin dl`); continue }
          const buf = await fetchBuffer(dlUrl)
          if (!isValidAudio(buf)) { console.log(`[play] ${ep.name} html no-audio`); continue }
          audioBuffer = buf
          audioTitle = res.data?.data?.title || res.data?.title || title
        } catch (e) { console.log(`[play] ${ep.name} falló: ${e.message}`) }
      }

      // v4 que devuelve directo el mp3
      if (!audioBuffer) {
        try {
          const resV4 = await axios.get(`${baseUrl}/dl/ytmp3v4?url=${encodeURIComponent(url)}&key=${api.key}`, { responseType: "arraybuffer", timeout: 40000 })
          const buf = Buffer.from(resV4.data)
          if (isValidAudio(buf)) audioBuffer = buf
        } catch (e) { console.log(`[play] v4 falló: ${e.message}`) }
      }

      if (!audioBuffer) {
        // aquí ahora sabrás por qué falla por la consola
        return msg.reply("《✧》 No se pudo descargar el *audio*, revisa tu consola. Si ves `sin dl` es que tu API cambió. Si ves `html no-audio` tu API está bloqueada por Cloudflare.")
      }

      const sizeMB = audioBuffer.length / (1024 * 1024)
      if (sizeMB > maxSize) return msg.reply(`《✧》 Pesa *${formatSize(sizeMB)}* y supera *${formatSize(maxSize)}*.`)

      const safeTitle = String(audioTitle).replace(/[\\/:*?"<>|]/g, "").slice(0, 60) || "audio"
      let thumbSmall = null
      if (thumbBuffer) {
        try { thumbSmall = await sharp(thumbBuffer).resize(300, 300).jpeg({ quality: 80 }).toBuffer() } catch { thumbSmall = null }
      }

      // Si es play o playaudio siempre manda como audio, solo si es muy grande como documento
      if (sizeMB > 30) {
        await sock.sendMessage(msg.chat, { document: audioBuffer, mimetype: "audio/mpeg", fileName: `${safeTitle}.mp3`, jpegThumbnail: thumbSmall }, { quoted: msg })
      } else {
        await sock.sendMessage(msg.chat, { audio: audioBuffer, mimetype: "audio/mpeg", ptt: false }, { quoted: msg })
      }

    } catch (e) {
      console.error(e)
      await msg.reply(`《✧》 Ocurrió un error: ${e.message}`)
    }
  }
}