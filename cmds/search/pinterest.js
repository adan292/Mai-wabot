import axios from "axios"
import { lang } from "#langs"

export default {
  command: ["pinterest", "pin"],
  category: "search",
  run: async ({ msg, sock, args, usedPrefix }) => {
    const t = await lang(msg.sender)
    const text = args.join(" ")
    const isPinterestUrl = /^https?:\/\//.test(text)

    if (!text) {
      return msg.reply(t.search.pinNoQuery())
    }

    try {
      if (isPinterestUrl) {
        const pinterestUrl = `${api.url}/dl/pinterest?url=${text}&key=${api.key}`
        const ress = await axios.get(pinterestUrl)
        const { data: result } = ress.data
        const mediaType = ["image", "video"].includes(result.type) ? result.type : "document"

        await sock.sendMessage(
          msg.chat,
          { [mediaType]: { url: result.dl }, caption: null },
          { quoted: msg }
        )
      } else {
        const pinterestAPI = `${api.url}/search/pinterest?query=${text}&key=${api.key}`
        const res = await axios.get(pinterestAPI)
        const jsons = res.data
        const results = jsons.data

        if (!results || results.length === 0) {
          return msg.reply(t.search.pinNoResults(text))
        }

        const medias = []
        for (const result of results.slice(0, 10)) {
          const url = result.hd || result.url
          if (!url) continue

          let caption = `${t.search.pinCaptionTitle()}\n\n`
          if (result.title)       caption += `${t.search.pinCaptionTitleLine(result.title)}\n`
          if (result.description) caption += `${t.search.pinCaptionDesc(result.description)}\n`
          if (result.full_name)   caption += `${t.search.pinCaptionAuthor(result.full_name)}\n`
          if (result.likes)       caption += `${t.search.pinCaptionLikes(result.likes)}\n`
          if (result.created)     caption += `${t.search.pinCaptionCreated(result.created)}`

          medias.push({
            image: { url },
            caption
          })
        }

        if (medias.length) {
          await sock.sendAlbumMessage(msg.chat, medias, { quoted: msg })
        } else {
          await msg.reply(t.search.pinNoProcess())
        }
      }
    } catch (e) {
      console.error("[pinterest] error:", e)
      await sock.reply(msg.chat, t.search.searchError(usedPrefix), msg)
    }
  },
}