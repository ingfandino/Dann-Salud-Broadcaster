// src/controllers/whatsappController.js

const Message = require("../models/Message");
const Autoresponse = require("../models/Autoresponse");
const { whatsappClient, whatsappEvents } = require("../config/whatsapp");

// Escucha de mensajes entrantes
whatsappEvents.on("message", async (msg) => {
    try {
        // ❌ Evitar responder a nuestros propios mensajes
        if (msg.fromMe) return;

        // 💾 Guardar mensaje en BD
        const newMessage = new Message({
            from: msg.from,
            to: msg.to || "me",
            contenido: msg.body,
            direction: "inbound",
            status: "recibido",
            timestamp: new Date(msg.timestamp * 1000),
        });
        await newMessage.save();
        console.log("💾 Mensaje entrante guardado:", msg.body);

        // 🔍 Buscar regla de auto-respuesta
        const reglas = await Autoresponse.find();
        const lowerBody = msg.body.toLowerCase();

        let matchedRule = null;
        for (let r of reglas) {
            if (lowerBody.includes(r.keyword.toLowerCase())) {
                matchedRule = r;
                break;
            }
        }

        // 🤖 Responder según regla
        if (matchedRule) {
            await whatsappClient.sendMessage(msg.from, matchedRule.response);
            console.log(`🤖 Auto-respuesta enviada: "${matchedRule.response}"`);
        } else {
            // (Opcional) fallback
            const fallback = reglas.find(r => r.isFallback);
            if (fallback) {
                await whatsappClient.sendMessage(msg.from, fallback.response);
                console.log(`🤖 Auto-respuesta fallback enviada: "${fallback.response}"`);
            }
        }

    } catch (err) {
        console.error("❌ Error en whatsappController:", err);
    }
});

module.exports = {};