/**
 * ============================================================
 * MODELO DE PLANTILLA DE MENSAJE (Template)
 * ============================================================
 * Almacena plantillas de mensajes reutilizables para envíos masivos.
 * 
 * El contenido puede incluir:
 * - Variables: {{nombre}}, {{telefono}} - Se reemplazan por datos del contacto
 * - Spintax: {Hola|Buenos días|Qué tal} - Se selecciona una opción aleatoria
 */

const mongoose = require("mongoose");

const TemplateSchema = new mongoose.Schema({
    /** Nombre identificador de la plantilla */
    nombre: {
        type: String,
        required: true,
    },
    /** Contenido del mensaje con variables y/o spintax */
    contenido: {
        type: String,
        required: true,
    },
    /** Usuario que creó la plantilla */
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.model("Template", TemplateSchema);