import { ZenCommand } from '../../lib/core/factory.js';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export default new ZenCommand('update')
  .addAlias('actualizar', 'upgrade')
  .setCooldown(10)
  .setCategory('Owner')
  .requireOwner()
  .setUsage('')
  .onExecute(async (ctx) => {
    await ctx.react('⏳');

    try {
      const { stdout, stderr } = await execFileAsync('git', ['pull', '--ff-only'], {
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true
      });

      const output = (stdout || stderr || '✅ Repositorio actualizado sin salida adicional.')
        .trim()
        .slice(0, 4000);

      await ctx.react('✅');
      return ctx.reply(
        `『 🔄 』 *ACTUALIZACIÓN*

` +
        `> Repositorio sincronizado con la rama remota.

` +
        `\`\`\`\n${output}\n\`\`\``
      );
    } catch (error) {
      const details = String(error?.stderr || error?.stdout || error?.message || error)
        .trim()
        .slice(0, 4000);

      await ctx.react('❌');
      return ctx.reply(
        `『 ❌ 』 *ACTUALIZACIÓN FALLIDA*

` +
        `> No se pudo actualizar el repositorio.

` +
        `\`\`\`\n${details || 'Error desconocido'}\n\`\`\``
      );
    }
  });
