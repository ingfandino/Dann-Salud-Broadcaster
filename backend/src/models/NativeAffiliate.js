/**
 * ============================================================
 * MODELO DE AFILIADO NATIVO (NativeAffiliate)
 * ============================================================
 * Almacena los registros enriquecidos generados por el bot de
 * adquisición de datos (dateasBot). Estos registros se obtienen
 * de Dateas, ARCA y CODEM, y NO tienen teléfono de contacto.
 */

const mongoose = require("mongoose");

const nativeAffiliateSchema = new mongoose.Schema(
    {
        /** Nombre completo extraído de Dateas */
        nombre: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        /** CUIL sin guiones (ej: 27457283909) */
        cuil: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            index: true
        },
        /** Obra social extraída de CODEM */
        obraSocial: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        /** Código de obra social extraído de CODEM */
        codigoObraSocial: {
            type: String,
            trim: true
        },
        /** Provincia extraída de Dateas */
        provincia: {
            type: String,
            trim: true
        },
        /** Localidad extraída de Dateas */
        localidad: {
            type: String,
            trim: true
        },
        /** Edad como entero (ej: 35) */
        edad: {
            type: Number,
            min: 0,
            max: 150
        },
        /** Siempre null/vacío — campo distinguidor de esta colección */
        telefono: {
            type: String,
            default: null
        },
        /** Último periodo de aporte confirmado (ej: "2025/03") */
        ultimoAporte: {
            type: String,
            trim: true
        },
        /** Cantidad de pagos en los últimos 3 meses cerrados */
        trimPagos: {
            type: Number,
            min: 0
        },
        /** DNI de 8 dígitos que generó este registro */
        dniOrigen: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

nativeAffiliateSchema.index({ nombre: "text" });
nativeAffiliateSchema.index({ obraSocial: 1, localidad: 1 });

module.exports = mongoose.model("NativeAffiliate", nativeAffiliateSchema);
