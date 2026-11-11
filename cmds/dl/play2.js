if (!res?.status || !res.data?.dl) {
        return msg.reply('《✧》 No se pudo descargar el video, intenta más tarde.')
      }

      // Opción A: Si tienes el buffer del video directamente desde res.data.dl (si dl es un buffer/base64)
      // Opción B: Si res.result.downloadUrl es una URL pública directa
      
      // Asumiendo que quieres enviar el buffer descargado previamente o usar la URL directa:
      // Si res.data.dl es un buffer binario:
      let videoToSend
      
      // Si la API devuelve un buffer en data.dl, úsalo. Si no, descarga desde downloadUrl
      if (res.data.dl && typeof res.data.dl !== 'string') {
          videoToSend = res.data.dl
      } else {
          // Fallback: Descargar desde la URL de resultado si existe
          if(res.result?.downloadUrl) {
               const respVideo = await fetch(res.result.downloadUrl)
               videoToSend = await respVideo.buffer()
          } else {
              throw new Error("No video content found in response")
          }
      }

      // CORRECCIÓN 3: Sintaxis correcta para fileName como string interpolado
      const fileName = ${res.result?.title || 'video'}.mp4

      const mensaje = {
        video: videoToSend, // Enviamos el buffer directamente
        fileName: fileName,
        mimetype: 'video/mp4',
        caption: *${title}* // Opcional: añadir título al video enviado
      }

      await sock.sendMessage(msg.chat, mensaje, { quoted: msg })
      
    } catch (e) {
      console.error(e)
      // Asegúrate de definir msgglobal o usa un string fijo
      await msg.reply(《✧》 Ocurrió un error inesperado: ${e.message || 'Error desconocido'})
    }
  }
}