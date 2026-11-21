import { ZenCommand } from '../../lib/core/factory.js';

const RESTART_DELAY_MS = 3000;

export default new ZenCommand('restart')
  .setCooldown(60)
  .setCategory('Owner')
  .requireOwner()
  .onExecute(async (ctx) => {
    await ctx.react('🔄');
    await ctx.reply(
      `『 🔄 』 *REINICIANDO BOT*\n\n` +
      `> El proceso se cerrará en unos segundos para que el administrador del servidor lo vuelva a iniciar.`
    );

    // Requiere que el hosting o process manager (PM2, systemd, Docker, etc.)
    // tenga habilitado el reinicio automático al terminar el proceso.
    setTimeout(() => process.exit(0), RESTART_DELAY_MS);
  });
