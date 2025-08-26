// src/config/whatsapp.js

const { Client } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const client = new Client({
    puppeteer: { headless: true }
});

let isReady = false;

client.on("qr", qr => {
    console.log("📱 Escanea este código QR con WhatsApp:");
    qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
    console.log("✅ WhatsApp conectado y listo!");
    isReady = true;
});

client.initialize();

module.exports = { client, isReady: () => isReady };