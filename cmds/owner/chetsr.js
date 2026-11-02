export default {
  command: ['chetsr'],
  category: 'owner',
  description: 'Otorga una cantidad específica de monedas al autor del comando',
  isOwner: true,
  run: async ({ msg, sock, args, usedPrefix }) => {
    const db = (await import('#db')).default;

    const amount = Number(args[0]?.replace(/[^0-9]/g, '') || 0);
    if (!args[0] || !Number.isFinite(amount) || amount <= 0) {
      return sock.sendMessage(msg.chat, {
        text: `《✧》 Debes indicar la cantidad a sumar.
Ejemplo: ${usedPrefix}chetsr 5000000`
      }, { quoted: msg });
    }

    try {
      const user = await db.getUser(msg.sender);
      const current = user?.coins || 0;
      const newTotal = current + amount;

      await db.updateUser(msg.sender, 'coins', newTotal);

      await sock.sendMessage(msg.chat, {
        text: `《✧》 *Dinero añadido correctamente.*

💰 Cantidad: *${amount.toLocaleString()}*
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
