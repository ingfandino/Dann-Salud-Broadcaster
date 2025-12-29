require('dotenv').config();
const mongoose = require('mongoose');
const Audit = require('./src/models/Audit');
const User = require('./src/models/User'); // Cargar modelo User para populate

async function buscarAfiliado() {
    try {
        const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
        
        if (!MONGO_URI) {
            console.error('❌ ERROR: No se encontró MONGODB_URI ni MONGO_URI en las variables de entorno');
            console.error('   Verifica tu archivo .env');
            return;
        }
        
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado a MongoDB\n');

        const cuil = '20426843111';
        const nombre = 'ALEGRE FRANCO NICOLAS';

        console.log('🔍 BUSCANDO AFILIADO:');
        console.log('   Nombre esperado:', nombre);
        console.log('   CUIL:', cuil);
        console.log('─'.repeat(80));

        // Buscar por CUIL exacto (sin populate para evitar errores de schema)
        let audits = await Audit.find({ cuil: cuil })
            .sort({ createdAt: -1 })
            .lean();

        console.log(`\n📋 RESULTADOS POR CUIL EXACTO (${cuil}):`, audits.length);

        if (audits.length === 0) {
            // Buscar por nombre (case insensitive) - buscar en ambos campos nombre y afiliado
            console.log('\n🔍 Buscando por nombre...');
            audits = await Audit.find({ 
                $or: [
                    { afiliado: { $regex: nombre, $options: 'i' } },
                    { nombre: { $regex: nombre, $options: 'i' } }
                ]
            })
            .sort({ createdAt: -1 })
            .lean();

            console.log(`📋 RESULTADOS POR NOMBRE (${nombre}):`, audits.length);
        }

        if (audits.length === 0) {
            console.log('\n❌ NO SE ENCONTRÓ NINGUNA AUDITORÍA CON ESE CUIL O NOMBRE\n');
            
            // Buscar variaciones del CUIL
            console.log('🔍 Buscando variaciones del CUIL...');
            const cuilVariations = [
                cuil,
                cuil.replace(/-/g, ''), // Sin guiones
                `20-${cuil.slice(2, -1)}-${cuil.slice(-1)}`, // Con guiones
            ];

            for (const variation of cuilVariations) {
                const found = await Audit.find({ cuil: variation }).lean();
                if (found.length > 0) {
                    console.log(`   ✅ Encontrado con variación: "${variation}" (${found.length} registros)`);
                    audits = await Audit.find({ cuil: variation })
                        .sort({ createdAt: -1 })
                        .lean();
                    break;
                }
            }

            if (audits.length === 0) {
                // Buscar nombres similares (primeras 10 letras)
                console.log('\n🔍 Buscando nombres similares...');
                const similarNames = await Audit.find({ 
                    $or: [
                        { afiliado: { $regex: '^ALEGRE', $options: 'i' } },
                        { nombre: { $regex: '^ALEGRE', $options: 'i' } }
                    ]
                })
                .select('afiliado nombre cuil estado createdAt')
                .limit(10)
                .lean();

                if (similarNames.length > 0) {
                    console.log(`\n📋 Nombres similares encontrados (${similarNames.length}):`);
                    similarNames.forEach((audit, idx) => {
                        const nombreMostrar = audit.afiliado || audit.nombre || 'N/A';
                        console.log(`   ${idx + 1}. ${nombreMostrar} (CUIL: ${audit.cuil}) - Estado: ${audit.estado}`);
                    });
                }
            }
        }

        if (audits.length > 0) {
            console.log('\n' + '═'.repeat(80));
            console.log('📊 DETALLES DE LAS AUDITORÍAS ENCONTRADAS:');
            console.log('═'.repeat(80));

            audits.forEach((audit, idx) => {
                console.log(`\n🔹 AUDITORÍA #${idx + 1}:`);
                console.log(`   ID: ${audit._id}`);
                console.log(`   Afiliado/Nombre: ${audit.afiliado || audit.nombre || 'N/A'}`);
                console.log(`   CUIL: ${audit.cuil || 'N/A'}`);
                console.log(`   Estado: ${audit.estado || audit.status || 'N/A'}`);
                console.log(`   Teléfono: ${audit.telefono || 'N/A'}`);
                console.log(`   Obra Social Vendida: ${audit.obraSocialVendida || audit.obraSocial || 'N/A'}`);
                console.log(`   Obra Social Anterior: ${audit.obraSocialAnterior || 'N/A'}`);
                console.log(`   Tipo Venta: ${audit.tipoVenta || 'N/A'}`);
                console.log(`   Fecha turno: ${audit.scheduledAt ? new Date(audit.scheduledAt).toLocaleString('es-AR') : (audit.fecha ? new Date(audit.fecha).toLocaleDateString('es-AR') : 'N/A')}`);
                console.log(`   Hora turno: ${audit.hora || 'N/A'}`);
                console.log(`   Asesor ID: ${audit.asesor || 'N/A'}`);
                console.log(`   Auditor ID: ${audit.auditor || 'N/A'}`);
                console.log(`   Administrador ID: ${audit.administrador || 'N/A'}`);
                console.log(`   Validador ID: ${audit.validador || 'N/A'}`);
                console.log(`   CreatedBy ID: ${audit.createdBy || 'N/A'}`);
                console.log(`   Es Recuperación: ${audit.isRecovery ? 'Sí' : 'No'}`);
                console.log(`   Mes Recuperación: ${audit.recoveryMonth || 'N/A'}`);
                console.log(`   Es Liquidación: ${audit.isLiquidacion ? 'Sí' : 'No'}`);
                console.log(`   Mes Liquidación: ${audit.liquidacionMonth || 'N/A'}`);
                console.log(`   Completa: ${audit.isComplete ? 'Sí' : 'No'}`);
                console.log(`   Creado: ${audit.createdAt ? new Date(audit.createdAt).toLocaleString('es-AR') : 'N/A'}`);
                
                if (audit.updatedAt) {
                    console.log(`   Actualizado: ${new Date(audit.updatedAt).toLocaleString('es-AR')}`);
                }
                
                if (audit.recoveryDeletedAt) {
                    console.log(`   ⚠️  Recovery Deleted At: ${new Date(audit.recoveryDeletedAt).toLocaleString('es-AR')}`);
                }
                
                if (audit.liquidacionDeletedAt) {
                    console.log(`   ⚠️  Liquidación Deleted At: ${new Date(audit.liquidacionDeletedAt).toLocaleString('es-AR')}`);
                }
                
                console.log('   ─'.repeat(40));
            });

            // Análisis de por qué no aparece
            console.log('\n' + '═'.repeat(80));
            console.log('🔍 ANÁLISIS: ¿Por qué no aparece en las vistas?');
            console.log('═'.repeat(80));

            const audit = audits[0];

            // FollowUp.jsx
            console.log('\n📄 FOLLOWUP.JSX:');
            console.log('   Condiciones para aparecer:');
            console.log('   1. Debe tener fecha válida (scheduledAt o fecha)');
            const fechaValida = audit.scheduledAt || audit.fecha;
            console.log(`      → Fecha: ${fechaValida ? '✅ ' + new Date(fechaValida).toLocaleDateString('es-AR') : '❌ No tiene'}`);
            console.log('   2. No debe estar en Recuperación (isRecovery sin recoveryMonth)');
            console.log(`      → isRecovery: ${audit.isRecovery ? '⚠️ TRUE' : '✅ false'}`);
            console.log(`      → recoveryMonth: ${audit.recoveryMonth ? '✅ ' + audit.recoveryMonth : '❌ No tiene'}`);
            console.log('   3. No debe estar eliminado de Recuperación');
            console.log(`      → recoveryDeletedAt: ${audit.recoveryDeletedAt ? '⚠️ ' + new Date(audit.recoveryDeletedAt).toLocaleDateString('es-AR') : '✅ null'}`);

            // LiquidacionList.jsx
            console.log('\n📄 LIQUIDACIONLIST.JSX:');
            console.log('   Condiciones para aparecer:');
            console.log('   1. Estado debe ser: QR hecho, Cargada, o Aprobada');
            const estadosValidos = ['QR hecho', 'Cargada', 'Aprobada'];
            const estadoActual = audit.estado || audit.status || '';
            console.log(`      → Estado actual: ${estadosValidos.includes(estadoActual) ? '✅' : '❌'} "${estadoActual}"`);
            console.log('   2. No debe estar en Recuperación (isRecovery sin recoveryMonth)');
            console.log(`      → isRecovery: ${audit.isRecovery ? '⚠️ TRUE' : '✅ false'}`);
            console.log(`      → recoveryMonth: ${audit.recoveryMonth ? '✅ ' + audit.recoveryMonth : '❌ No tiene'}`);
            console.log('   3. No debe estar eliminado de Liquidación');
            console.log(`      → liquidacionDeletedAt: ${audit.liquidacionDeletedAt ? '⚠️ ' + new Date(audit.liquidacionDeletedAt).toLocaleDateString('es-AR') : '✅ null'}`);

            // Conclusión
            console.log('\n' + '═'.repeat(80));
            console.log('💡 CONCLUSIÓN:');
            console.log('═'.repeat(80));

            let problemas = [];

            // Verificar soft-delete
            if (audit.recoveryDeletedAt) {
                problemas.push('❌ ELIMINADO DE RECUPERACIÓN (recoveryDeletedAt tiene fecha)');
                problemas.push(`   → Eliminado el: ${new Date(audit.recoveryDeletedAt).toLocaleString('es-AR')}`);
                problemas.push('   → NO aparecerá en RecoveryList hasta que se elimine este campo');
            }

            if (audit.liquidacionDeletedAt) {
                problemas.push('❌ ELIMINADO DE LIQUIDACIÓN (liquidacionDeletedAt tiene fecha)');
                problemas.push(`   → Eliminado el: ${new Date(audit.liquidacionDeletedAt).toLocaleString('es-AR')}`);
                problemas.push('   → NO aparecerá en LiquidacionList hasta que se elimine este campo');
            }

            if (audit.isRecovery && !audit.recoveryMonth) {
                problemas.push('⚠️  Tiene isRecovery: true pero NO tiene recoveryMonth');
                problemas.push('   → Debería aparecer en RecoveryList.jsx (si no está soft-deleted)');
            }

            if (!estadosValidos.includes(estadoActual)) {
                problemas.push(`⚠️  Estado "${estadoActual}" no es válido para LiquidacionList`);
                problemas.push('   → Estados válidos: QR hecho, Cargada, Aprobada');
            }

            if (!fechaValida) {
                problemas.push('❌ No tiene fecha de turno asignada (scheduledAt ni fecha)');
            }

            if (problemas.length > 0) {
                console.log('\n🔴 PROBLEMAS DETECTADOS:\n');
                problemas.forEach(p => console.log(`   ${p}`));
            } else {
                console.log('\n✅ No se detectaron problemas. Debería aparecer en las vistas.');
            }
        }

        console.log('\n' + '═'.repeat(80));
        console.log('✅ Búsqueda completada');
        console.log('═'.repeat(80) + '\n');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

buscarAfiliado();
