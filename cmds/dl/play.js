import db from "#db"
import ytsearch from "yt-search"
import sharp from "sharp"
import axios from "axios"

async function fetchBuffer(url) {
  try {
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 })
    return Buffer.from(res.data)
  } catch {
    return null
  }
}

function formatSize(mb) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  return `${mb.toFixed(2)} MB`
}

function isValidAudio(buf) {
  if (!buf || buf.length < 1000) return false
  const head = buf.slice(0, 500).toString().toLowerCase()
  if (head.includes('<html') || head.includes('<!doctype') || head.includes('error')) return false
  return true
}

function isYoutubeUrl(text) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com)\/.+/i.test(text)
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
      const settings = (await db.getSettings(botId)) || {}
      const botOfc = global?.sock?.user?.id?.split(':')[0] + '@s.whatsapp.net' || ''
      const isOficialBot = botId === botOfc
      const isModBot = Number(settings.botmod) === 1
      const isPremiumBot = Number(settings.botprem) === 1
      
      // maxSize en MB
      const maxSize = isOficialBot ? 5120 : isModBot ? 3072 : isPremiumBot ? 2048 : 100

      const api = global.api || globalThis.api
      if (!api?.url || !api?.key) {
        return msg.reply("《✧》 La API de descarga no está configurada.")
      }

      const text = args.join(" ").trim()
      let video

      if (isYoutubeUrl(text)) {
        // si es URL directa, usarla sin buscar
        const searchResult = await ytsearch(text)
        video = searchResult?.videos?.[0] || { url: text, title: "audio", timestamp: "", views: 0, seconds: 0, image: "", author: { name: "YouTube" } }
        // si yt-search no da info, igual usamos la url directa
        if (searchResult?.videos?.length) video = searchResult.videos[0]
        else video.url = text
      } else {
        const searchResult = await ytsearch(text)
        if (!searchResult?.videos?.length) {
          return msg.reply("《✧》 No se encontró información del video.")
        }
        video = searchResult.videos[0]
      }

      const { author, timestamp: duration, views, url, image, seconds } = video
      const title = String(video.title || "audio")
      const vistas = (views || 0).toLocaleString()
      const canal = author?.name || author || "Desconocido"

      const estimatedMB = ((seconds || 0) * 128000) / 8 / (1024 * 1024)
      if (estimatedMB > maxSize) {
        return msg.reply(`《✧》 El archivo pesa aprox *${formatSize(estimatedMB)}* y supera el límite de este Socket *(${formatSize(maxSize)})*.`)
      }

      // Thumbnail con try/catch para no crashear
      let thumbBuffer = null
      if (image) thumbBuffer = await fetchBuffer(image)

      if (thumbBuffer) {
        const caption = `【　✿　】 _\`୨୧  Download\` ───── *${title}*_

> _✐ \`Canal\` ── ${canal}_
> _ⴵ \`Duración\` ── ${duration || "Desconocida"}_
> _✰ \`Vistas\` ── ${vistas}_
> _🜸 \`Enlace\` ── ${url}_

> _──  ִ    ۟  *¡Enviando audio, por favor espera!*_`

        try {
          await sock.sendMessage(msg.chat, { image: thumbBuffer, caption }, { quoted: msg })
        } catch {
          await sock.sendMessage(msg.chat, { text: caption }, { quoted: msg })
        }
      }

      let audioBuffer = null
      let audioTitle = title
      const baseUrl = String(api.url).replace(/\/+$/, "")

      const intentos = ["v1", "v2", "v3"]
      for (const v of intentos) {
        if (audioBuffer) break
        try {
          const res = await axios.get(`${baseUrl}/dl/ytmp3${v === "v1" ? "" : v}?url=${encodeURIComponent(url)}&key=${api.key}`, { timeout: 20000 })
          const data = res.data
          const dlUrl = data?.data?.dl || data?.result?.dl || data?.dl
          if (!dlUrl) continue
          const buf = await fetchBuffer(dlUrl)
          if (!isValidAudio(buf)) continue
          audioBuffer = buf
          audioTitle = String(data?.data?.title || data?.title || title)
        } catch (e) {
          console.log(`[play] ${v} falló: ${e.message}`)
        }
      }

      // v4 directo en arraybuffer
      if (!audioBuffer) {
        try {
          const resV4 = await axios.get(`${baseUrl}/dl/ytmp3v4?url=${encodeURIComponent(url)}&key=${api.key}`, { responseType: "arraybuffer", timeout: 40000 })
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
        return msg.reply(`《✧》 El archivo pesa *${formatSize(sizeMB)}* y supera el límite *(${formatSize(maxSize)})*.`)
      }

      const safeTitle = String(audioTitle).replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 60) || "audio"
      let thumbSmall = null
      if (thumbBuffer) {
        try {
          thumbSmall = await sharp(thumbBuffer).resize(300, 300).jpeg({ quality: 75 }).toBuffer()
        } catch {
          thumbSmall = null
        }
      }

      // play, ytmp3, ytaudio, playaudio -> siempre como audio. Si pesa mucho, manda como documento
      const shouldSendAsDoc = sizeMB > 25

      if (!shouldSendAsDoc) {
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
          ...(thumbSmall ? { jpegThumbnail: thumbSmall } : {})
        }, { quoted: msg })
      }

    } catch (e) {
      console.error("[play command error]", e)
      await msg.reply(`《✧》 Ocurrió un error al procesar el audio. Usa ${usedPrefix || '#'}help`)
    }
  }
}