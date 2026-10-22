![](assets/menu-banner.png)

# Bunny-girl-BOT

Scaffold mínimo de bot WhatsApp (Meta Cloud API) en Node.js.

Requisitos:
- Cuenta y app en Meta / WhatsApp Business Cloud API
- PHONE_NUMBER_ID y WHATSAPP_TOKEN (desde Meta)
- APP_SECRET (opcional pero recomendado)
- ngrok o URL HTTPS pública para el webhook

Instalación:
1. Copia .env.example a .env y completa variables.
2. npm install
3. npm run dev   (o npm start)

Variables (.env):
- WHATSAPP_TOKEN: token de acceso (Bearer).
- PHONE_NUMBER_ID: id del número desde Meta.
- VERIFY_TOKEN: token para verificar webhook (elige uno).
- APP_SECRET: secret de la app (opcional, para verificar firma).
- PORT: puerto local (opcional, default 3000).

Probar localmente:
1. Inicia el servicio: npm run dev
2. Expón el puerto con ngrok: ngrok http 3000
3. En Meta Developers → tu app → Webhooks: configura la URL a `https://<tu-ngrok>/webhook` y usa VERIFY_TOKEN.
4. Envia un mensaje al número configurado; el servidor responderá con un eco.

Notas importantes:
- Mensajes fuera de la ventana de 24h requieren plantillas aprobadas por WhatsApp.
- No subas tokens ni .env al repositorio; usa secretos o variables de entorno en el servicio de despliegue.
- Si configuras APP_SECRET, el servidor valida la cabecera `x-hub-signature-256`.
- Puedes integrar un motor NLP (OpenAI, Dialogflow, Rasa) guardando el estado por usuario (Redis).

Licencia / derechos de imagen
- Asegúrate de tener derechos para publicar la imagen en el repo público. Si la imagen es de terceros y no tienes permiso, considera usarla solo localmente o añadirla en un lugar privado.

Opcional: centrar la imagen en el README
<p align="center">
  <img src="assets/menu-banner.png" alt="menu-banner" width="700"/>
</p>
