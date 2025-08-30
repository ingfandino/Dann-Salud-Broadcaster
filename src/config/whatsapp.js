// src/config/whatsapp.js
const { Client } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const EventEmitter = require("events");

const whatsappEvents = new EventEmitter();

const client = new Client({
    puppeteer: { headless: true }
});

let isReady = false;

// Cuando se genera QR
client.on("qr", qr => {
    console.log("📱 Escanea este código QR con WhatsApp:");
    qrcode.generate(qr, { small: true });
    whatsappEvents.emit("qr", qr); // lo emitimos
});

// Cuando está listo
client.on("ready", () => {
    console.log("✅ WhatsApp conectado y listo!");
    isReady = true;
    whatsappEvents.emit("ready");
});

// Cuando llega un mensaje
client.on("message", msg => {
    console.log("📩 Mensaje recibido:", msg.body);
    whatsappEvents.emit("message", msg);
});

client.initialize();

module.exports = { client, isReady: () => isReady, whatsappEvents };