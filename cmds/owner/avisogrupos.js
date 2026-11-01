export default {
  name: "avisogrupos",
  alias: ["bcgrupos", "broadcastgc", "avisoall"],
  category: "owner",
  isOwner: true,
  desc: "Aviso de Mai a todos los grupos",
  
  async run({ sock, msg, args }) {
    const text = args.join(" ").trim()
    if (!text) {
      return sock.sendMessage(msg.chat, {
        text: `Ay... Senpai, escribe el aviso.\n\nEjemplo:\n#avisogrupos Hola, estaré en mantenimiento mañana`
      }, { quoted: msg })
    }

    const avisoMsg = 
`╭─「 *AVISO DE MAI* 🐰 」─╮
│
│  ${text}
│
│  Ay... no es como si me importara
│  que lo lean o no, baka Senpai.
│
│  乂 Mai Sakurajima
╰─────────────────╯`

    await sock.sendMessage(msg.chat, { 
      text: `Ay... buscando todos los grupos donde estoy... dame un segundo, Senpai.` 
    }, { quoted: msg })

    let enviados = 0
    let fallidos = 0
    let todosLosGrupos = []

    try {
      const principal = await sock.groupFetchAllParticipating()
      todosLosGrupos = Object.keys(principal)

      const subBots = global.conns || global.jadibots || []

      for (let conn of subBots) {
        try {
          let s = conn.sock || conn[1] || conn
          if (!s?.groupFetchAllParticipating) continue
          let g = await s.groupFetchAllParticipating()
          for (let id of Object.keys(g)) {
            if (!todosLosGrupos.includes(id)) todosLosGrupos.push(id)
          }
        } catch {}
      }

      await sock.sendMessage(msg.chat, {
        text: `Encontré *${todosLosGrupos.length}* grupos donde estoy, Senpai. Empezaré a avisar... tonto.`
      }, { quoted: msg })

      for (let id of todosLosGrupos) {
        try {
          await new Promise(r => setTimeout(r, 1500))
          await sock.sendMessage(id, { text: avisoMsg })
          enviados++
        } catch {
          fallidos++
        }
      }

      await sock.sendMessage(msg.chat, {
        text: `Listo, Senpai... ya terminé.\n\n✿ Grupos avisados: ${enviados}\n✿ Fallidos: ${fallidos}\n\nNo es como si lo hubiera hecho por ti o algo así...`
      }, { quoted: msg })

    } catch (e) {
      await sock.sendMessage(msg.chat, { text: `Ay... hubo un error, Senpai: ${e.message}` }, { quoted: msg })
    }
  }
}