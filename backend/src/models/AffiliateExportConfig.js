/**
 * ============================================================
 * MODELO DE CONFIGURACIÓN DE EXPORTACIÓN DE AFILIADOS
 * ============================================================
 * Define las reglas para la exportación automática diaria de afiliados
 * a supervisores. Permite configurar cantidad, distribución por obra social,
 * y mezcla de datos frescos vs reutilizables.
 * 
 * Tipos de envío:
 * - masivo: Misma configuración para todos los supervisores
 * - avanzado: Configuración individualizada por supervisor
 */

const mongoose = require("mongoose");

const affiliateExportConfigSchema = new mongoose.Schema(
    {
        /** Usuario que creó la configuración (gerencia) */
        configuredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        /** Tipo de distribución: masivo (igual para todos) o avanzado (personalizado) */
        sendType: {
            type: String,
            enum: ["masivo", "avanzado"],
            default: "masivo"
        },

        /* ========== CONFIGURACIÓN MASIVA ========== */
        
        /** Cantidad de afiliados por archivo */
        affiliatesPerFile: {
            type: Number,
            min: 1,
            max: 10000,
            default: 100
        },

        /** Distribución por obra social */
        obraSocialDistribution: [{
            obraSocial: String,
            cantidad: Number
        }],

        /* ========== CONFIGURACIÓN AVANZADA ========== */
        
        /** Configuración individual por supervisor */
        supervisorConfigs: [{
            supervisorId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            affiliatesPerFile: {
                type: Number,
                min: 1,
                max: 10000
            },
            obraSocialDistribution: [{
                obraSocial: String,
                cantidad: Number
            }],
            dataSourceMix: {
                freshPercentage: { type: Number, min: 0, max: 100, default: 50 },
                reusablePercentage: { type: Number, min: 0, max: 100, default: 50 }
            }
        }],

        /** Hora de ejecución diaria (formato HH:mm) */
        scheduledTime: {
            type: String,
            required: true,
            validate: {
                validator: function (v) {
                    return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(v);
                },
                message: props => `${props.value} no es una hora válida (formato HH:mm)`
            }
        },

        /** Filtros opcionales para la selección de afiliados */
        filters: {
            localidad: String,
            minAge: Number,
            maxAge: Number
        },

        /* ========== MEZCLA DE FUENTES DE DATOS ========== */
        
        /** Configuración global de proporción frescos/reutilizables */
        dataSourceMix: {
            enabled: { type: Boolean, default: true },
            freshPercentage: { type: Number, min: 0, max: 100, default: 50 },
            reusablePercentage: { type: Number, min: 0, max: 100, default: 50 }
        },

        /* ========== SISTEMA DE CANCELACIÓN ========== */
        
        /** Control de pausas en la exportación automática */
        cancellation: {
            type: {
                type: String,
                enum: ['none', 'today', 'indefinite'],
                default: 'none'
            },
            cancelledAt: Date,
            cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            skipDate: Date
        },

        /** Estado activo de la configuración */
        active: { type: Boolean, default: true },
        /** Fecha de última ejecución */
        lastExecuted: { type: Date },
        /** Próxima ejecución programada */
        nextExecution: { type: Date }
    },
    {
        timestamps: true
    }
);

/** Solo puede existir una configuración activa */
affiliateExportConfigSchema.index({ active: 1 }, { unique: true, partialFilterExpression: { active: true } });

module.exports = mongoose.model("AffiliateExportConfig", affiliateExportConfigSchema);
