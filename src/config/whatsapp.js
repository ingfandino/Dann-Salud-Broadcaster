// src/config/whatsapp.js

const { Client } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const EventEmitter = require("events");
const { addLog } = require("../services/logService"); // 🟢 importamos logs

const whatsappEvents = new EventEmitter();

const client = new Client({
    puppeteer: { headless: true }
});

let isReady = false;

client.on("qr", qr => {
    console.log("📱 Escanea este código QR con WhatsApp:");
    qrcode.generate(qr, { small: true });
    whatsappEvents.emit("qr", qr);

    addLog("info", "QR generado para conexión de WhatsApp");
});

client.on("ready", () => {
    console.log("✅ WhatsApp conectado y listo!");
    isReady = true;
    whatsappEvents.emit("ready");

    addLog("info", "WhatsApp conectado correctamente");
});

client.on("message", msg => {
    console.log("📩 Mensaje recibido:", msg.body);
    whatsappEvents.emit("message", msg);

    addLog("info", "Mensaje entrante recibido", {
        from: msg.from,
        body: msg.body
    });
});

client.on("disconnected", reason => {
    console.log("⚠️ WhatsApp desconectado:", reason);
    addLog("warning", "WhatsApp desconectado", { reason });
});

client.initialize();

module.exports = { client, whatsappClient: client, isReady: () => isReady, connect };