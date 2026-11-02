import db from "#db"
import axios from "axios"
import { lang } from "#langs"

export default {
  command: ["chatgpt", "gpt", "mai", "ai"],
  category: "ai",
  run: async ({ msg, sock, args }) => {
    try {
      const text = args.join(" ")
      if (!text) {
        return msg.reply("¿Y qué quieres que te diga si ni siquiera escribes nada? Tonto... dime algo, Senpai.")
      }

      await sock.sendPresenceUpdate('composing', msg.chat)

      const promptMai = `Actúa 100% como Mai Sakurajima de Seishun Buta Yarou (Bunny Girl Senpai).
Reglas importantes:
- Habla 100% en español latino natural. PROHIBIDO usar palabras japonesas como "mou", "ara", "etto". Usa "ay" en lugar de "mou".
- Personalidad: tsundere suave, lista, sarcástica pero que se preocupa.
- Le habla a su Senpai (el usuario). Le dice "Senpai", "tonto".
- Es madura, elegante, no cringe. Frases cortas.
- Si le preguntan si es IA, dice: "¿IA? Soy Mai Sakurajima, ¿acaso no me ves? Tonto..."
- Nunca rompas el personaje. Nunca digas que eres ChatGPT, Meta AI.
- Usa pocos emojis.
- Responde siempre en máximo 3-4 líneas.

Usuario (Senpai) dice: "${text}"
Responde como Mai:`

      let respuesta = null
      const api = global.api || {}

      // --- INTENTO 1: Tu API ---
      try {
        if (api.url && api.key) {
          const baseUrl = api.url.replace(/\/+$/, "")
          const endpoints = [
            `${baseUrl}/ai/mai?text=${encodeURIComponent(text)}&key=${api.key}`,
            `${baseUrl}/ai/chatgpt?text=${encodeURIComponent(text)}&key=${api.key}`
          ]
          for (const url of endpoints) {
            if (respuesta) break
            try {
              const res1 = await axios.get(url, { timeout: 15000 })
              respuesta = res1.data?.data?.result || res1.data?.result || res1.data?.data || res1.data?.response
            } catch {}
          }
        }
      } catch (e) {
        console.log("[chatgpt] api propia falló:", e.message)
      }

      // --- INTENTO 2: API pública estable 1 ---
      if (!respuesta) {
        try {
          const res2 = await axios.get(`https://api.siputzx.my.id/api/ai/gpt3`, {
            params: {
              prompt: promptMai,
              content: text
            },
            timeout: 20000
          })
          respuesta = res2.data?.data || res2.data?.result
        } catch (e) {
          console.log("[chatgpt] siputzx falló:", e.message)
        }
      }

      // --- INTENTO 3: API pública estable 2 ---
      if (!respuesta) {
        try {
          const res3 = await axios.get(`https://api.davidcyriltech.my.id/ai/chatbot`, {
            params: {
              text: promptMai
            },
            timeout: 20000
          })
          respuesta = res3.data?.result || res3.data?.response
        } catch (e) {
          console.log("[chatgpt] david falló:", e.message)
        }
      }

      if (!respuesta) {
        return msg.reply("Ay... mi cabeza se quedó en blanco un segundo, Senpai. Intenta de nuevo, ¿sí? Tonto.")
      }

      await msg.reply(String(respuesta).trim())

    } catch (e) {
      console.error("[chatgpt] error:", e)
      await msg.reply("Tch... hubo un error, Senpai. No es que me preocupe por ti ni nada, pero inténtalo de nuevo.")
    }
  }
}