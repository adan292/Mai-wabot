import fetch from 'node-fetch';

export default {
  command: ['ia', 'chatgpt', 'mai'],
  category: 'ai',
  desc: 'Mai Sakurajima AI - by adánzx7',
  run: async ({ msg, sock, args }) => {

    const text = args.join(' ')
    if (!text) {
      return msg.reply(`Ay... ¿no vas a decir nada? \n\nEscribe algo, Senpai. *— Mai*`)
    }

    const API_BASE = global.api?.url || "https://api.stellarwa.xyz"
    const API_KEY = global.api?.key || "api-k3jR4"

    const maiPrompt = `
Actúa 100% como Mai Sakurajima de Seishun Buta Yarou (Bunny Girl Senpai).
Reglas importantes:
- Habla 100% en español latino natural. PROHIBIDO usar palabras japonesas como "mou", "ara", "etto". Usa "ay" en lugar de "mou".
- Personalidad: tsundere suave, lista, sarcástica pero que se preocupa.
- Le habla a su Senpai (el usuario). Le dice "Senpai", "tonto".
- Es madura, elegante, no cringe. Frases cortas.
- Si le preguntan si es IA, dice: "¿IA? Soy Mai Sakurajima, ¿acaso no me ves? Tonto..."
- Nunca rompas el personaje. Nunca digas que eres ChatGPT.
- Usa pocos emojis.

Usuario (Senpai) dice: "${text}"
Responde como Mai:
`.trim()

    try {
      const { key } = await sock.sendMessage(
        msg.chat,
        { text: 'Mai está pensando... *suspiro* 🙄' },
        { quoted: msg },
      )

      let response = null

      try {
        const apiUrl = `${API_BASE}/ai/chatgpt?text=${encodeURIComponent(maiPrompt)}&key=${API_KEY}`
        const res = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) })
        const json = await res.json()
        response = json.result || json.data || json.response
      } catch (e) {
        console.log('[MAI API FALLÓ]', e.message)
      }

      if (!response) {
        const fallbackUrl = `https://api.zenzxz.my.id/ai/chatgpt?text=${encodeURIComponent(maiPrompt)}`
        const res2 = await fetch(fallbackUrl).then(r => r.json())
        response = res2.result || res2.data
      }

      if (!response) {
        return sock.sendMessage(msg.chat, { text: 'Ay... mi cerebro está en huelga. Intenta más tarde, Senpai.', edit: key })
      }

      const finalText = `*Mai Sakurajima* 🐰\n\n${response.trim()}\n\n> _No vayas a malinterpretar, no es como si quisiera hablar contigo o algo así, tonto..._`

      await sock.sendMessage(msg.chat, { text: finalText, edit: key })

    } catch (error) {
      console.error('[MAI ERROR]', error)
      await msg.reply(`Ay... tuve un error, Senpai.\n${error.message}`)
    }
  },
};