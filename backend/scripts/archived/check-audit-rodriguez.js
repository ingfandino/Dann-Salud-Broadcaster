// Script para verificar el estado de la auditoría de Rodriguez Ezequiel Adonai
const mongoose = require('mongoose');
require('dotenv').config();

const Audit = require('./src/models/Audit');
const User = require('./src/models/User'); // ✅ Requerido para populate

async function checkAudit() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        const cuil = '20441724129';
        
        // Buscar la auditoría por CUIL
        const audit = await Audit.findOne({ cuil: cuil })
            .populate('asesor', 'nombre name email numeroEquipo')
            .populate('auditor', 'nombre name email')
            .populate('administrador', 'nombre name email')
            .lean();
        
        if (!audit) {
            console.log(`❌ No se encontró ninguna auditoría con CUIL: ${cuil}`);
            process.exit(1);
        }
        
        console.log('\n📋 INFORMACIÓN DE LA AUDITORÍA:');
        console.log('================================');
        console.log('ID:', audit._id);
        console.log('Nombre:', audit.nombre);
        console.log('CUIL:', audit.cuil);
        console.log('Teléfono:', audit.telefono);
        console.log('\n📊 ESTADO ACTUAL:');
        console.log('================================');
        console.log('Status:', audit.status);
        console.log('Status actualizado:', audit.statusUpdatedAt);
        console.log('Fecha turno (scheduledAt):', audit.scheduledAt);
        console.log('\n🔍 FLAGS DE VISIBILIDAD:');
        console.log('================================');
        console.log('isRecovery:', audit.isRecovery);
        console.log('recoveryMovedAt:', audit.recoveryMovedAt);
        console.log('recoveryMonth:', audit.recoveryMonth);
        console.log('recoveryDeletedAt:', audit.recoveryDeletedAt);
        console.log('recoveryEligibleAt:', audit.recoveryEligibleAt);
        console.log('\n👥 ASIGNACIONES:');
        console.log('================================');
        console.log('Asesor:', audit.asesor?.nombre || audit.asesor?.name || 'No asignado');
        console.log('Asesor numeroEquipo:', audit.asesor?.numeroEquipo || 'N/A');
        console.log('Auditor:', audit.auditor?.nombre || audit.auditor?.name || 'No asignado');
        console.log('Administrador:', audit.administrador?.nombre || audit.administrador?.name || 'No asignado');
        
        console.log('\n🔎 ANÁLISIS:');
        console.log('================================');
        
        // Verificar por qué no aparece en FollowUp
        const reasons = [];
        
        if (audit.isRecovery === true) {
            reasons.push('❌ isRecovery=true → Está marcada para Recovery (excluida de FollowUp)');
        }
        
        if (audit.recoveryDeletedAt) {
            reasons.push('❌ recoveryDeletedAt existe → Fue soft-deleted de Recovery');
        }
        
        const recoveryStates = [
            "Falta clave", 
            "Rechazada", 
            "Falta documentación",
            "No atendió",
            "Tiene dudas",
            "Falta clave y documentación",
            "No le llegan los mensajes",
            "Cortó"
        ];
        
        if (recoveryStates.includes(audit.status)) {
            reasons.push(`⚠️ Estado="${audit.status}" → Es un estado de recuperación`);
            
            if (audit.recoveryEligibleAt) {
                const now = new Date();
                if (new Date(audit.recoveryEligibleAt) <= now) {
                    reasons.push('⚠️ recoveryEligibleAt ya pasó → Elegible para Recovery');
                }
            }
        }
        
        if (reasons.length > 0) {
            console.log('🚨 RAZONES POR LAS QUE NO APARECE EN FOLLOWUP:');
            reasons.forEach(r => console.log('  ', r));
        } else {
            console.log('✅ No hay razones obvias. Debería aparecer en FollowUp.');
        }
        
        console.log('\n💡 SOLUCIÓN RECOMENDADA:');
        console.log('================================');
        
        if (audit.isRecovery === true && audit.status !== "QR hecho") {
            console.log('Para que vuelva a aparecer en FollowUp:');
            console.log('1. Actualizar: isRecovery = false');
            console.log('2. Actualizar: recoveryDeletedAt = null');
            console.log('3. Actualizar: recoveryMovedAt = null');
            console.log('4. O cambiar el estado a uno NO de recuperación');
            console.log('\n¿Quieres que ejecute la corrección? (Necesitas implementar la actualización)');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkAudit();
