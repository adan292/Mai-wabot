export function getMenuQuoted(sender = '0@s.whatsapp.net', pushName = 'Usuario') {
  const menuStamps = [
    {
      key: {
        fromMe: false,
        participant: sender,
        remoteJid: 'status@broadcast'
      },
      message: {
        productMessage: {
          product: {
            title: `🐰🐇 MaiBot | adánzx7`,
            description: `Bienvenido, ${pushName} 👋`,
            currencyCode: 'USD',
            priceAmount1000: '999999999',
            retailerId: 'Maibot-Adanzx7',
            productImageCount: 1
          },
          businessOwnerJid: '0@s.whatsapp.net'
        }
      }
    },
    {
      key: {
        fromMe: false,
        participant: sender,
        remoteJid: 'status@broadcast'
      },
      message: {
        documentMessage: {
          title: `Maibot | Adanzx7`,
          fileName: `MaiBot - Menú Oficial`,
          mimetype: 'application/pdf',
          pageCount: 777,
          fileLength: '999999999999'
        }
      }
    },
    {
      key: {
        fromMe: false,
        participant: sender,
        remoteJid: 'status@broadcast'
      },
      message: {
        locationMessage: {
          degreesLatitude: 35.6762,
          degreesLongitude: 139.6503,
          name: `MaiBot • Official Menu`,
          address: `Developed by Adanzx7`
        }
      }
    }
  ];

  return menuStamps[Math.floor(Math.random() * menuStamps.length)];
}

export function getRandomReplyQuoted(sender = '0@s.whatsapp.net', pushName = 'Usuario') {
  const replyStamps = [
    {
      key: {
        fromMe: false,
        participant: sender,
        remoteJid: 'status@broadcast'
      },
      message: {
        audioMessage: {
          mimetype: 'audio/mp4',
          ptt: true,
          seconds: 999999
        }
      }
    },
    {
      key: {
        fromMe: false,
        participant: sender,
        remoteJid: 'status@broadcast'
      },
      message: {
        documentMessage: {
          title: `MaiBot | Adanzx7`,
          fileName: `MaiBot - Core V11`,
          mimetype: 'application/octet-stream',
          fileLength: '10485760'
        }
      }
    },
    {
      key: {
        fromMe: false,
        participant: sender,
        remoteJid: 'status@broadcast'
      },
      message: {
        locationMessage: {
          degreesLatitude: -34.6037,
          degreesLongitude: -58.3816,
          name: `MaiBot • System Online`,
          address: `Developed by Adanzx7`
        }
      }
    },
    {
      key: {
        fromMe: false,
        participant: sender,
        remoteJid: 'status@broadcast'
      },
      message: {
        productMessage: {
          product: {
            title: `ZenBot | Axelix09`,
            description: `Hola, ${pushName} 👋`,
            currencyCode: 'USD',
            priceAmount1000: '999999999',
            retailerId: 'adanzx7-Maibot',
            productImageCount: 1
          },
          businessOwnerJid: '0@s.whatsapp.net'
        }
      }
    },
    {
      key: {
        fromMe: false,
        participant: sender,
        remoteJid: 'status@broadcast'
      },
      message: {
        contactMessage: {
          displayName: `Maibot | Adanzx7`,
          vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;ZenBot;;;\nFN:ZenBot | Axelix09\nORG:ZenBot Core\nTEL;type=CELL;type=VOICE;waid=${sender.split('@')[0]}:+${sender.split('@')[0]}\nEND:VCARD`
        }
      }
    },
    {
      key: {
        fromMe: false,
        participant: sender,
        remoteJid: 'status@broadcast'
      },
      message: {
        extendedTextMessage: {
          text: `⚡ Maibot | Adanzx7`
        }
      }
    }
  ];

  return replyStamps[Math.floor(Math.random() * replyStamps.length)];
}