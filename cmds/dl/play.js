import db from "#db"
import ytsearch from "yt-search"
import sharp from "sharp"
import axios from "axios"
import { lang } from "#langs"

async function fetchBuffer(url) {
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 })
  return Buffer.from(res.data)
}

function formatSize(mb) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  return `${mb.toFixed(2)} MB`
}

function isValidAudio(buf) {
  if (!buf || buf.length < 1000) return false
  const head = buf.slice(0, 300).toString().toLowerCase()
  if (head.includes('<html') || head.includes('<!doctype') || head.includes('{"error"')) return false
  return true
}

export default {
  command: ["play", "mp3", "ytmp3", "ytaudio", "playaudio"],
  category: "downloader",
  run: async ({ msg, sock, args, command, usedPrefix }) => {
    const t = await lang(msg.sender)
    try {
      if (!args[0]) return msg.reply(t.downloader.pNoInput())

      const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net'
      const settings = await db.getSettings(botId) || {}
      const botOfc = global?.sock?.user?.id?.split(':')[0] + '@s.whatsapp.net' || ''
      const isOficialBot = botId === botOfc
      const isModBot = Number(settings.botmod) === 1
      const isPremiumBot = Number(settings.botprem) === 1
      const maxSize = isOficialBot ? 5 * 1024 : isModBot ? 3 * 1024 : isPremiumBot ? 2 * 1024 : 100

      // FIX: definir api correctamente
      const api = global.api || globalThis.api || { url: "", key: "" }
      if (!api.url || !api.key) {
        return msg.reply(t.downloader.pNoInput() + "\n\nAPI no configurada")
      }

      const text = args.join(" ")
      const searchResult = await ytsearch(text)
      if (!searchResult.videos || !searchResult.videos.length) {
        return msg.reply(t.downloader.pNoInfo())
      }

      const video = searchResult.videos[0]
      const { author, timestamp: duration, views, url, image, seconds } = video
      const title = String(video.title || "audio")
      const vistas = (views || 0).toLocaleString()
      const canal = author?.name || author || "Desconocido"

      const estimatedMB = ((seconds || 0) * 128000) / 8 / (1024 * 1024)
      if (estimatedMB > maxSize) {
        return msg.reply(t.downloader.dlLimitExceededAprox(formatSize(estimatedMB), formatSize(maxSize)))
      }

      const thumbBuffer = await fetchBuffer(image)
      const caption = t.downloader.pCaption(title, canal, duration || "", vistas, url)

      await sock.sendMessage(msg.chat, { image: thumbBuffer, caption }, { quoted: msg })

      let audioBuffer = null
      let audioTitle = title
      const baseUrl = api.url.replace(/\/+$/, "")

      const intentos = [
        { name: "v1", url: `${baseUrl}/dl/ytmp3?url=${encodeURIComponent(url)}&key=${api.key}`, pick: d => d?.data?.dl || d?.result?.dl || d?.dl },
        { name: "v2", url: `${baseUrl}/dl/ytmp3v2?url=${encodeURIComponent(url)}&key=${api.key}`, pick: d => d?.data?.dl || d?.result?.dl || d?.dl },
        { name: "v3", url: `${baseUrl}/dl/ytmp3v3?url=${encodeURIComponent(url)}&key=${api.key}`, pick: d => d?.data?.dl || d?.result?.dl || d?.dl }
      ]

      for (const it of intentos) {
        if (audioBuffer) break
        try {
          const res = await axios.get(it.url, { timeout: 25000 })
          const dlUrl = it.pick(res.data)
          if (!dlUrl) continue
          const buf = await fetchBuffer(dlUrl)
          if (!isValidAudio(buf)) { console.log(`[play] ${it.name} no-audio`); continue }
          audioBuffer = buf
          audioTitle = String(res.data?.data?.title || res.data?.title || title)
        } catch (e) { console.log(`[play] ${it.name} falló: ${e.message}`) }
      }

      if (!audioBuffer) {
        try {
          const resV4 = await axios.get(
            `${baseUrl}/dl/ytmp3v4?url=${encodeURIComponent(url)}&key=${api.key}`,
            { responseType: "arraybuffer", timeout: 40000 }
          )
          const buf = Buffer.from(resV4.data)
          if (isValidAudio(buf)) {
            audioBuffer = buf
          }
        } catch (e) { console.log(`[play] v4 falló: ${e.message}`) }
      }

      if (!audioBuffer) return msg.reply(t.downloader.pNoDownload())

      const sizeMB = audioBuffer.length / (1024 * 1024)
      if (sizeMB > maxSize) {
        return msg.reply(t.downloader.dlLimitExceeded(formatSize(sizeMB), formatSize(maxSize)))
      }

      const safeTitle = audioTitle.replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 60) || "audio"
      let thumbBuffer2
      try {
        thumbBuffer2 = await sharp(thumbBuffer).resize(300, 300).jpeg({ quality: 80 }).toBuffer()
      } catch {
        thumbBuffer2 = thumbBuffer
      }
      
      const isAudioNormal = command === "playaudio" || command === "ytaudio"

      if (isAudioNormal || sizeMB < 10) {
        await sock.sendMessage(msg.chat, {
          audio: audioBuffer, mimetype: "audio/mpeg", ptt: false
        }, { quoted: msg })
      } else {
        await sock.sendMessage(msg.chat, {
          document: audioBuffer, mimetype: "audio/mpeg",
          fileName: `${safeTitle}.mp3`, jpegThumbnail: thumbBuffer2
        }, { quoted: msg })
      }
    } catch (e) {
      console.error(e)
      await msg.reply(t.downloader.dlError(usedPrefix))
    }
  }
}