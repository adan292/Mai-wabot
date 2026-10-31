import axios from "axios"
import fetch from "node-fetch"

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
  command: ["pinterest", "pin"],
  category: "search",
  desc: "Buscador y descargador de Pinterest",
  run: async ({ msg, sock, args }) => {
    const text = args.join(" ").trim()
    if (!text) {
      return msg.reply(`✿ Ingresa un *término* de búsqueda o un enlace de *Pinterest*.`)
    }

    const isPinterestUrl = /^https?:\/\/.*pinterest/.test(text) || text.includes('pin.it')

    try {
      // CONFIG DE TU API - cambiala si usas otra
      const API_BASE = global.api?.url || "https://api.alyacore.xyz"
      const API_KEY = global.api?.key || "adanzx7"

      if (isPinterestUrl) {
        await sock.sendMessage(msg.chat, { react: { text: '🕒', key: msg.key } })
        
        const pinterestUrl = `${API_BASE}/dl/pinterest?url=${encodeURIComponent(text)}&key=${API_KEY}`
        console.log(`[PINTEREST DL] ${pinterestUrl}`)
        
        const { data: res } = await axios.get(pinterestUrl, { timeout: 15000 })
        const result = res.data || res.result || res

        if (!result?.dl) {
          return msg.reply(`✿ No se pudo descargar el pin.\nRespuesta API: ${JSON.stringify(res).slice(0,300)}`)
        }

        const isVideo = result.type === 'video' || result.dl.includes('.mp4')
        const mediaType = isVideo ? 'video' : 'image'

        await sock.sendMessage(
          msg.chat,
          { [mediaType]: { url: result.dl }, caption: `✿ *Pinterest DL*\n> ${result.title || ''}` },
          { quoted: msg }
        )

      } else {
        // BUSQUEDA
        await sock.sendMessage(msg.chat, { react: { text: '🔎', key: msg.key } })

        const pinterestAPI = `${API_BASE}/search/pinterest?query=${encodeURIComponent(text)}&key=${API_KEY}`
        console.log(`[PINTEREST SEARCH] ${pinterestAPI}`)

        const { data: jsons } = await axios.get(pinterestAPI, { timeout: 15000 })
        const results = jsons.data || jsons.result || []

        if (!results || results.length === 0) {
          return msg.reply(`✿ No se encontraron resultados para *${text}*`)
        }

        // FIX: sendAlbumMessage no existe en base Mai, usamos carrusel manual
        // Si tu base sí tiene album, descomenta la parte de album
        const toSend = results.slice(0, 5) // mando 5 para no spamear

        for (const result of toSend) {
          try {
            const imgUrl = result.hd || result.url || result.image
            if (!imgUrl) continue

            const caption =
`ꕥ Pinterest Search ࣭

${result.title ? `✿ Título › *${result.title}*\n` : ""}` +
`${result.description ? `❀ Descripción › *${result.description.slice(0,100)}*\n` : ""}` +
`${result.full_name ? `❑ Autor › *${result.full_name}*\n` : ""}` +
`${result.likes ? `♡ Likes › *${result.likes}*\n` : ""}`

            await sock.sendMessage(msg.chat, {
              image: { url: imgUrl },
              caption
            }, { quoted: msg })

            await new Promise(r => setTimeout(r, 800)) // anti-spam
          } catch (e) {
            console.log('[PIN IMG FAIL]', e.message)
          }
        }

        await sock.sendMessage(msg.chat, { react: { text: '✔️', key: msg.key } })
      }

    } catch (e) {
      console.error('[PINTEREST ERROR]', e.response?.data || e.message)
      await sock.sendMessage(msg.chat, { react: { text: '✖️', key: msg.key } })
      await msg.reply(`✿ Error Pinterest: ${e.message}\n\nAvisa a adánzx7\n${e.response?.data ? JSON.stringify(e.response.data).slice(0,500) : ''}`)
    }
  },
}