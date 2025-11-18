// backend/src/models/AffiliateExportConfig.js

const mongoose = require("mongoose");

const affiliateExportConfigSchema = new mongoose.Schema(
    {
        // Usuario que configuró (debe ser gerencia)
        configuredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        
        // Tipo de envío: "masivo" o "avanzado"
        sendType: {
            type: String,
            enum: ["masivo", "avanzado"],
            default: "masivo"
        },
        
        // ========== CONFIGURACIÓN MASIVA ==========
        // Cantidad de afiliados por archivo (solo para envío masivo)
        affiliatesPerFile: {
            type: Number,
            min: 1,
            max: 10000,
            default: 100
        },
        
        // Distribución por obra social (para envío masivo)
        // Ej: [{ obraSocial: "OSDE", cantidad: 100 }, { obraSocial: "Medifé", cantidad: 50 }]
        obraSocialDistribution: [{
            obraSocial: String,
            cantidad: Number
        }],
        
        // ========== CONFIGURACIÓN AVANZADA ==========
        // Configuraciones individuales por supervisor (para envío avanzado)
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
            // Distribución de obras sociales específica para este supervisor
            obraSocialDistribution: [{
                obraSocial: String,
                cantidad: Number
            }]
        }],
        
        // Hora de envío diario (formato HH:mm, ej: "09:00")
        scheduledTime: {
            type: String,
            required: true,
            validate: {
                validator: function(v) {
                    return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(v);
                },
                message: props => `${props.value} no es una hora válida (formato HH:mm)`
            }
        },
        
        // Filtros opcionales para la generación (aplicados globalmente)
        filters: {
            localidad: String,
            minAge: Number,
            maxAge: Number
        },
        
        // Estado
        active: {
            type: Boolean,
            default: true
        },
        
        // Última ejecución
        lastExecuted: {
            type: Date
        },
        
        // Próxima ejecución programada
        nextExecution: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

// Solo puede haber una configuración activa a la vez
affiliateExportConfigSchema.index({ active: 1 }, { unique: true, partialFilterExpression: { active: true } });

module.exports = mongoose.model("AffiliateExportConfig", affiliateExportConfigSchema);
