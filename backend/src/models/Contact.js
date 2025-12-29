/**
 * ============================================================
 * MODELO DE CONTACTO (Contact)
 * ============================================================
 * Almacena los datos de contactos para envío de mensajes masivos.
 * Se diferencia de Affiliate en que Contact se usa específicamente
 * para campañas de WhatsApp (SendJob).
 */

const mongoose = require("mongoose");

const ContactSchema = new mongoose.Schema(
    {
        /** Nombre completo del contacto */
        nombre: { type: String, required: true },
        /** Número de teléfono para envío */
        telefono: { type: String, required: true, index: true },
        /** CUIL del contacto */
        cuil: { type: String, required: true },
        /** Usuario que creó el contacto */
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        /** Datos adicionales dinámicos importados del Excel */
        extraData: { type: Map, of: String },
        /** Timestamp de cuando recibió mensaje masivo exitoso (flag permanente anti-duplicado) */
        massMessagedAt: { type: Date, default: null, index: true },
        /** Flag para contactos que NO tienen WhatsApp (rechazar en futuras importaciones) */
        noWhatsApp: { type: Boolean, default: false, index: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Contact", ContactSchema);