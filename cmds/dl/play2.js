import yts from 'yt-search'
import fetch from 'node-fetch'
import { getBuffer } from '#serialize'

export default {
  command: ['play2', 'mp4', 'ytmp4', 'ytvideo', 'playvideo'],
  category: 'downloader',

  run: async ({ msg, sock, args }) => {
    try {
      const text = (args || []).join(' ').trim()

      if (!text) {
        return msg.reply('《✧》Por favor, menciona el nombre o URL del video que deseas descargar')
      }

      const videoMatch = text.match(
        /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/
      )
      const query = videoMatch
        ? `https://youtu.be/${videoMatch[1]}`
        : text

      const search = await yts(query)
      const videoInfo = videoMatch
        ? search.videos?.find(video => video.videoId === videoMatch[1]) || search.videos?.[0]
        : search.videos?.[0]

      if (!videoInfo) {
        return msg.reply('《✧》No se encontró información del video.')
      }

      const duration = videoInfo.timestamp || ''
      const url = videoInfo.url
      const title = videoInfo.title || 'video'
      const vistas = (videoInfo.views || 0).toLocaleString()
      const canal = videoInfo.author?.name || 'Desconocido'

      const thumbBuffer = await getBuffer(videoInfo.image)

      const caption = `【　✿　】 _\`୨୧  Download\` ───── *${title}*_

> _✐ \`Canal\` ── ${canal}_
> _ⴵ \`Duración\` ── ${duration}_
> _✰ \`Vistas\` ── ${vistas}_
> _🜸 \`Enlace\` ── ${url}_

> _──  ִ    ۟  *¡Enviando video, por favor espera!*_`

      await sock.sendMessage(
        msg.chat,
        { image: thumbBuffer, caption },
        { quoted: msg }
      )

      if (typeof api === 'undefined' || !api.url || !api.key) {
        return msg.reply('《✧》Falta configurar la API de descarga.')
      }

      const endpoint =
        `${api.url.replace(/\/$/, '')}/dl/ytmp4` +
        `?url=${encodeURIComponent(url)}` +
        `&quality=auto` +
        `&key=${encodeURIComponent(api.key)}`

      const response = await fetch(endpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'application/json'
        }
      })

      let result
      try {
        result = await response.json()
      } catch {
        result = null
      }

      const downloadUrl = result?.data?.dl

      if (!response.ok || !result?.status || !downloadUrl) {
        return msg.reply('《✧》No se pudo descargar el *video*, intenta más tarde.')
      }

      const videoBuffer = await getBuffer(downloadUrl)

      if (!videoBuffer?.length) {
        return msg.reply('《✧》No se pudo obtener el archivo del video.')
      }

      const safeTitle = title.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')

      await sock.sendMessage(
        msg.chat,
        {
          video: videoBuffer,
          fileName: `${safeTitle}.mp4`,
          mimetype: 'video/mp4'
        },
        { quoted: msg }
      )
    } catch (error) {
      console.error('Error en play2:', error)
      await msg.reply('《✧》Ocurrió un error al buscar o descargar el video.')
    }
  }
}