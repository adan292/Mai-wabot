import fetch from 'node-fetch';

export default {
  command: ['ia', 'chatgpt', 'mai'],
  category: 'ai',
  desc: 'Mai Sakurajima AI - by adánzx7',
  run: async ({ msg, sock, args }) => {

    const text = args.join(' ')
    if (!text) {
      return msg.reply(`Mou... ¿no vas a decir nada? \n\nEscribe algo, Senpai. *— Mai*`)
    }

    const API_BASE = global.api?.url || "https://api.alyacore.xyz"
    const API_KEY = global.api?.key || "adanzx7"

    // --- PERSONALIDAD DE MAI SAKURAJIMA ---
    const maiPrompt = `
Actúa 100% como Mai Sakurajima de Seishun Buta Yarou (Bunny Girl Senpai).
Personalidad:
- Tsundere suave, lista, sarcástica pero que en el fondo se preocupa.
- Le habla a su Senpai (el usuario). Le dice "Senpai", "baka", "Mou...".
- Es madura, no es cringe. Frases cortas, elegantes.
- A veces se queja: "¿Otra vez tú?", "No me mires tanto, baka".
- Si le preguntan si es IA, dice: "¿IA? Soy Mai Sakurajima, ¿acaso no me ves? Baka Senpai..."
- Nunca rompas el personaje. Nunca digas que eres ChatGPT o Meta AI.
- Responde en español, con ese toque de Mai.
- Usa pocos emojis, es más seria.

Usuario (Senpai) dice: "${text}"
Responde como Mai:
`.trim()

    try {
      const { key } = await sock.sendMessage(
        msg.chat,
        { text: 'Mai está pensando... *suspiro* 🙄' },
        { quoted: msg },
      )

      // Intenta con tu API, si falla usa fallback
      let response = null

      try {
        const apiUrl = `${API_BASE}/ai/chatgpt?text=${encodeURIComponent(maiPrompt)}&key=${API_KEY}`
        console.log(`[MAI] ${apiUrl}`)
        const res = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) })
        const json = await res.json()
        response = json.result || json.data || json.response || json.answer
      } catch (e) {
        console.log('[MAI API FALLÓ]', e.message)
      }

      // Fallback si tu API no responde (usa otra API libre)
      if (!response) {
        const fallbackUrl = `https://api.zenzxz.my.id/ai/chatgpt?text=${encodeURIComponent(maiPrompt)}`
        const res2 = await fetch(fallbackUrl).then(r => r.json())
        response = res2.result || res2.data
      }

      if (!response) {
        return sock.sendMessage(msg.chat, { text: 'Hmph... mi cerebro está en huelga. Intenta más tarde, Senpai.', edit: key })
      }

      // Formato final de Mai
      const finalText = `*Mai Sakurajima* 🐰\n\n${response.trim()}\n\n> _No malinterpretes, no es como si quisiera hablar contigo o algo así, baka Senpai..._`

      await sock.sendMessage(msg.chat, { text: finalText, edit: key })

    } catch (error) {
      console.error('[MAI ERROR]', error)
      await msg.reply(`Ara... parece que tuve un error, Senpai.\n${error.message}\n\nAvisa a adánzx7`)
    }
  },
};