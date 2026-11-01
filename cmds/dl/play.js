import db from "#db"
import ytsearch from "yt-search"
import sharp from "sharp"
import axios from "axios"

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
  const str = buf.slice(0, 500).toString().toLowerCase()
  if (str.includes('<html') || str.includes('<!doctype')) return false
  return true
}

export default {
  command: ["play", "mp3", "ytmp3", "ytaudio", "playaudio"],
  category: "downloader",
  run: async ({ msg, sock, args, command, usedPrefix }) => {
    try {
      if (!args[0]) {
        return msg.reply("《✧》 Por favor, menciona el nombre o URL del video que deseas descargar.")
      }

      const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net'
      const settings = await db.getSettings(botId) || {}
      const botOfc = global?.sock?.user?.id?.split(':')[0] + '@s.whatsapp.net' || ''
      const isOficialBot = botId === botOfc
      const isModBot = Number(settings.botmod) === 1
      const isPremiumBot = Number(settings.botprem) === 1
      const maxSize = isOficialBot ? 5 * 1024 : isModBot ? 3 * 1024 : isPremiumBot ? 2 * 1024 : 100

      const api = global.api || globalThis.api
      if (!api?.url || !api?.key) {
        return msg.reply("《✧》 La API de descarga no está configurada.")
      }

      const text = args.join(" ")
      const searchResult = await ytsearch(text)
      if (!searchResult?.videos?.length) {
        return msg.reply("《✧》 No se encontró información del video.")
      }

      const video = searchResult.videos[0]
      const { author, timestamp: duration, views, url, image, seconds } = video
      const title = String(video.title || "audio")
      const vistas = (views || 0).toLocaleString()
      const canal = author?.name || author || "Desconocido"

      const estimatedMB = ((seconds || 0) * 128000) / 8 / (1024 * 1024)
      if (estimatedMB > maxSize) {
        return msg.reply(`《✧》 El archivo solicitado pesa aproximadamente *${formatSize(estimatedMB)}* y supera el límite permitido para este Socket *(${formatSize(maxSize)})*.`)
      }

      const thumbBuffer = await fetchBuffer(image)
      const caption = `【　✿　】 _\`୨୧  Download\` ───── *${title}*_

> _✐ \`Canal\` ── ${canal}_
> _ⴵ \`Duración\` ── ${duration || ""}_
> _✰ \`Vistas\` ── ${vistas}_
> _🜸 \`Enlace\` ── ${url}_

> _──  ִ    ۟  *¡Enviando audio, por favor espera!*_`

      await sock.sendMessage(msg.chat, { image: thumbBuffer, caption }, { quoted: msg })

      let audioBuffer = null
      let audioTitle = title
      const baseUrl = String(api.url).replace(/\/+$/, "")

      const intentos = [
        { name: "v1", url: `${baseUrl}/dl/ytmp3?url=${encodeURIComponent(url)}&key=${api.key}`, pick: d => d?.data?.dl || d?.result?.dl || d?.dl },
        { name: "v2", url: `${baseUrl}/dl/ytmp3v2?url=${encodeURIComponent(url)}&key=${api.key}`, pick: d => d?.data?.dl || d?.result?.dl || d?.dl },
        { name: "v3", url: `${baseUrl}/dl/ytmp3v3?url=${encodeURIComponent(url)}&key=${api.key}`, pick: d => d?.data?.dl || d?.result?.dl || d?.dl }
      ]

      for (const it of intentos) {
        if (audioBuffer) break
        try {
          const res = await axios.get(it.url, { timeout: 20000 })
          const dlUrl = it.pick(res.data)
          if (!dlUrl) continue
          const buf = await fetchBuffer(dlUrl)
          if (!isValidAudio(buf)) {
            console.log(`[play] ${it.name} no-audio`)
            continue
          }
          audioBuffer = buf
          audioTitle = String(res.data?.data?.title || res.data?.title || title)
        } catch (e) {
          console.log(`[play] ${it.name} falló: ${e.message}`)
        }
      }

      if (!audioBuffer) {
        try {
          const resV4 = await axios.get(
            `${baseUrl}/dl/ytmp3v4?url=${encodeURIComponent(url)}&key=${api.key}`,
            { responseType: "arraybuffer", timeout: 30000 }
          )
          const buf = Buffer.from(resV4.data)
          if (isValidAudio(buf)) audioBuffer = buf
        } catch (e) {
          console.log(`[play] v4 falló: ${e.message}`)
        }
      }

      if (!audioBuffer) {
        return msg.reply("《✧》 No se pudo descargar el *audio*, intenta más tarde.")
      }

      const sizeMB = audioBuffer.length / (1024 * 1024)
      if (sizeMB > maxSize) {
        return msg.reply(`《✧》 El archivo solicitado pesa *${formatSize(sizeMB)}* y supera el límite permitido para este Socket *(${formatSize(maxSize)})*.`)
      }

      const safeTitle = String(audioTitle).replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 60) || "audio"
      let thumbBuffer2
      try {
        thumbBuffer2 = await sharp(thumbBuffer).resize(300, 300).jpeg({ quality: 80 }).toBuffer()
      } catch {
        thumbBuffer2 = thumbBuffer
      }

      const isAudioNormal = command === "playaudio" || command === "ytaudio"

      if (isAudioNormal || sizeMB < 10) {
        await sock.sendMessage(msg.chat, {
          audio: audioBuffer,
          mimetype: "audio/mpeg",
          ptt: false
        }, { quoted: msg })
      } else {
        await sock.sendMessage(msg.chat, {
          document: audioBuffer,
          mimetype: "audio/mpeg",
          fileName: `${safeTitle}.mp3`,
          jpegThumbnail: thumbBuffer2
        }, { quoted: msg })
      }
    } catch (e) {
      console.error(e)
      await msg.reply(`《✧》 Ocurrió un error al procesar el audio. Usa ${usedPrefix || '#'}help`)
    }
  }
}
