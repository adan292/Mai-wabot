export default {
  command: ['chetsr'],
  category: 'owner',
  description: 'Otorga una cantidad específica de la moneda del bot al autor del comando',
  isOwner: true,
  run: async ({ msg, sock, args, usedPrefix }) => {
    const db = (await import('#db')).default;

    const amount = Number(args[0]?.replace(/[^0-9]/g, '') || 0);
    if (!args[0] || !Number.isFinite(amount) || amount <= 0) {
      return sock.sendMessage(msg.chat, {
        text: `《✧》 Debes indicar la cantidad a sumar.\nEjemplo: ${usedPrefix}chetsr 5000000`
      }, { quoted: msg });
    }

    try {
      const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const settings = (await db.getSettings(botJid)) || {};
      const currency = settings.currency || 'coins';

      const user = (await db.getUser(msg.sender)) || {};
      const current = Number(user.coins || 0);
      const total = current + amount;

      await db.updateUser(msg.sender, 'coins', total);

      await sock.sendMessage(msg.chat, {
        text: `《✧》 *Dinero añadido correctamente.*\n\n💰 Cantidad: *${amount.toLocaleString()} ${currency}*\n💵 Total actual: *${total.toLocaleString()} ${currency}*`
      }, { quoted: msg });
    } catch (e) {
      console.error(e);
      await sock.sendMessage(msg.chat, {
        text: `《✧》 No se pudo completar la operación: ${e.message || e}`
      }, { quoted: msg });
    }
  }
};
