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
        
        // Cantidad de afiliados por archivo CSV
        affiliatesPerFile: {
            type: Number,
            required: true,
            min: 1,
            max: 10000,
            default: 100
        },
        
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
        
        // Filtros opcionales para la generación
        filters: {
            obraSocial: String,
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
