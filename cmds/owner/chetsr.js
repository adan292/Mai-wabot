export default {
  command: ['chetsr'],
  category: 'owner',
  description: 'Otorga 5,000,000,000 monedas del bot a un usuario',
  isOwner: true,
  run: async ({ msg, sock, args, usedPrefix }) => {
    const db = (await import('#db')).default;

    const target = args[0]?.trim();
    if (!target) {
      return sock.sendMessage(msg.chat, {
        text: `《✧》 Debes mencionar el número o @usuario.
Ejemplo: ${usedPrefix}chetsr 573001234567`
      }, { quoted: msg });
    }

    const jid = target.includes('@') ? target : `${target.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

    try {
      const user = await db.getUser(jid);
      const current = user?.coins || 0;
      const newTotal = current + 5000000000;

      await db.updateUser(jid, 'coins', newTotal);

      await sock.sendMessage(msg.chat, {
        text: `《✧》 *Cheto money activado.*

✅ Usuario: ${jid}
💰 Monedas agregadas: *5,000,000,000*
💵 Total actual: *${newTotal.toLocaleString()}*`
      }, { quoted: msg });
    } catch (e) {
      console.error(e);
      await sock.sendMessage(msg.chat, {
        text: `《✧》 No se pudo completar la operación: ${e.message || e}`
      }, { quoted: msg });
    }
  }
};
