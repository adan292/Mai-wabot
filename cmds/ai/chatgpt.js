import axios from "axios"

export default {
  command: ["chatgpt", "gpt", "mai", "ai", "bot"],
  category: "ai",
  run: async ({ msg, sock, args }) => {
    const text = args.join(" ")
    if (!text) return msg.reply("Dime algo, Senpai... tonto.")

    try {
      await sock.sendPresenceUpdate('composing', msg.chat)

      const promptMai = `Actua como Mai Sakurajima, tsundere suave, hablas español latino, le dices Senpai y tonto a tu usuario, frases cortas, elegante. Si te preguntan si eres IA di: ¿IA? Soy Mai Sakurajima, ¿acaso no me ves? Tonto... Usuario dice: ${text}`

      let respuesta = null

      // Intento 1 - tu api si existe
      try {
        if (global.api?.url) {
          const base = global.api.url.replace(/\/+$/, "")
          const r = await axios.get(`${base}/ai/mai?text=${encodeURIComponent(text)}&key=${global.api.key}`, { timeout: 10000 })
          respuesta = r.data?.data?.result || r.data?.result
        }
      } catch {}

      // Intento 2 - api publica
      if (!respuesta) {
        try {
          const r2 = await axios.get(`https://api.siputzx.my.id/api/ai/gpt3`, {
            params: { prompt: promptMai, content: text },
            timeout: 15000
          })
          respuesta = r2.data?.data || r2.data?.result
        } catch (e) {
          console.log("Fallo siputzx", e.message)
        }
      }

      if (!respuesta) return msg.reply("Ay Senpai, se me nubló la mente un segundo, intenta de nuevo.")

      await msg.reply(String(respuesta))

    } catch (e) {
      console.log(e)
      await msg.reply("Error, Senpai... tonto.")
    }
  }
}