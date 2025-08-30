// testSend.js
const mongoose = require("mongoose");
const { sendMessages } = require("./src/services/sendMessageService");

(async () => {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/dannsalud");

        const mockContacts = [
            { _id: "123", telefono: "5491123456789", rendered: "Hola Juan, prueba dinámica" },
            { _id: "456", telefono: "5491198765432" } // este usa el template plano
        ];

        await sendMessages(mockContacts, "Mensaje genérico de prueba", "ownerUserIdFake");

        console.log("✅ Test finalizado");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error en test:", err);
        process.exit(1);
    }
})();