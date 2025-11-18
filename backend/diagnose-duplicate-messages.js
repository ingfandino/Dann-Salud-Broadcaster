// 🚨 DIAGNÓSTICO COMPLETO DE MENSAJES DUPLICADOS
const mongoose = require('mongoose');
require('dotenv').config();

const SendJob = require('./src/models/SendJob');
const Message = require('./src/models/Message');
const Contact = require('./src/models/Contact');

async function diagnoseDuplicates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        console.log('🔍 DIAGNÓSTICO COMPLETO DE DUPLICADOS\n');
        console.log('═'.repeat(60));

        // === PARTE 1: Análisis de Jobs ===
        console.log('\n📊 PARTE 1: ANÁLISIS DE JOBS RECIENTES\n');
        
        const recentJobs = await SendJob.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('contacts')
            .lean();

        if (recentJobs.length === 0) {
            console.log('   ⚠️ No hay jobs en la base de datos');
        } else {
            for (let i = 0; i < recentJobs.length; i++) {
                const job = recentJobs[i];
                console.log(`\n${i + 1}. Job: ${job.name}`);
                console.log(`   ID: ${job._id}`);
                console.log(`   Status: ${job.status}`);
                console.log(`   Creado: ${job.createdAt?.toLocaleString('es-AR')}`);
                console.log(`   Total contactos en array: ${job.contacts?.length || 0}`);

                // Verificar duplicados en el array de contactos
                if (job.contacts && Array.isArray(job.contacts)) {
                    const contactIds = job.contacts.map(c => c._id?.toString() || c.toString());
                    const uniqueIds = new Set(contactIds);
                    const duplicateCount = contactIds.length - uniqueIds.size;
                    
                    if (duplicateCount > 0) {
                        console.log(`   🚨 DUPLICADOS ENCONTRADOS: ${duplicateCount} contactos repetidos en el array`);
                        
                        // Mostrar cuáles están duplicados
                        const idCounts = {};
                        contactIds.forEach(id => {
                            idCounts[id] = (idCounts[id] || 0) + 1;
                        });
                        
                        const duplicatedIds = Object.entries(idCounts)
                            .filter(([id, count]) => count > 1)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5);
                        
                        console.log(`   Contactos más duplicados:`);
                        for (const [id, count] of duplicatedIds) {
                            const contact = job.contacts.find(c => (c._id?.toString() || c.toString()) === id);
                            const phone = contact?.telefono || 'N/A';
                            console.log(`      • ID ${id.slice(-8)} repetido ${count} veces (tel: ${phone})`);
                        }
                    } else {
                        console.log(`   ✅ Sin duplicados en array de contactos`);
                    }

                    // Verificar duplicados por teléfono normalizado
                    const phones = job.contacts
                        .map(c => c.telefono)
                        .filter(p => p)
                        .map(p => normalizePhone(p));
                    
                    const uniquePhones = new Set(phones);
                    const phoneDuplicates = phones.length - uniquePhones.size;
                    
                    if (phoneDuplicates > 0) {
                        console.log(`   🚨 ${phoneDuplicates} números de teléfono duplicados (normalizados)`);
                    }
                }
            }
        }

        // === PARTE 2: Análisis de Mensajes ===
        console.log('\n\n📧 PARTE 2: ANÁLISIS DE MENSAJES DUPLICADOS\n');
        
        const duplicateMessages = await Message.aggregate([
            {
                $match: {
                    direction: 'outbound',
                    timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Últimos 7 días
                }
            },
            {
                $group: {
                    _id: {
                        job: '$job',
                        to: '$to'
                    },
                    count: { $sum: 1 },
                    messages: { $push: { id: '$_id', timestamp: '$timestamp', status: '$status' } }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 20
            }
        ]);

        if (duplicateMessages.length === 0) {
            console.log('   ✅ NO se encontraron mensajes duplicados en los últimos 7 días');
        } else {
            console.log(`   🚨 SE ENCONTRARON ${duplicateMessages.length} CASOS DE MENSAJES DUPLICADOS\n`);
            
            for (let i = 0; i < Math.min(10, duplicateMessages.length); i++) {
                const dup = duplicateMessages[i];
                const phoneNumber = dup._id.to.replace('@c.us', '');
                
                console.log(`   ${i + 1}. Número: ${phoneNumber}`);
                console.log(`      Job: ${dup._id.job}`);
                console.log(`      Mensajes enviados: ${dup.count}`);
                
                // Calcular tiempos entre mensajes
                const timestamps = dup.messages.map(m => new Date(m.timestamp)).sort((a, b) => a - b);
                if (timestamps.length > 1) {
                    const timeDiffs = [];
                    for (let j = 1; j < timestamps.length; j++) {
                        const diffMs = timestamps[j] - timestamps[j-1];
                        const diffSec = Math.round(diffMs / 1000);
                        timeDiffs.push(diffSec);
                    }
                    console.log(`      Tiempo entre envíos: ${timeDiffs.join('s, ')}s`);
                }
                console.log('');
            }
        }

        // === PARTE 3: Análisis de Contactos ===
        console.log('\n👥 PARTE 3: ANÁLISIS DE CONTACTOS DUPLICADOS\n');
        
        const duplicateContacts = await Contact.aggregate([
            {
                $group: {
                    _id: '$telefono',
                    count: { $sum: 1 },
                    ids: { $push: '$_id' },
                    nombres: { $push: '$nombre' }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 10
            }
        ]);

        if (duplicateContacts.length === 0) {
            console.log('   ✅ NO hay contactos con el mismo teléfono');
        } else {
            console.log(`   ⚠️ ${duplicateContacts.length} teléfonos tienen múltiples contactos:\n`);
            
            for (let i = 0; i < duplicateContacts.length; i++) {
                const dup = duplicateContacts[i];
                console.log(`   ${i + 1}. Teléfono: ${dup._id}`);
                console.log(`      Contactos con este número: ${dup.count}`);
                console.log(`      IDs: ${dup.ids.map(id => id.toString().slice(-8)).join(', ')}`);
                console.log(`      Nombres: ${dup.nombres.slice(0, 3).join(', ')}`);
                console.log('');
            }
        }

        // === PARTE 4: Verificar Caso Específico ===
        console.log('\n🔬 PARTE 4: ANÁLISIS DE CASO ESPECÍFICO (último job)\n');
        
        const lastJob = await SendJob.findOne().sort({ createdAt: -1 }).populate('contacts').lean();
        
        if (lastJob) {
            console.log(`   Job: ${lastJob.name}`);
            console.log(`   ID: ${lastJob._id}`);
            console.log(`   Contactos en job.contacts: ${lastJob.contacts?.length || 0}`);
            console.log(`   Stats.total: ${lastJob.stats?.total || 0}`);
            
            // Mensajes enviados para este job
            const messagesForJob = await Message.find({ job: lastJob._id, direction: 'outbound' }).lean();
            console.log(`   Mensajes en BD: ${messagesForJob.length}`);
            
            // Verificar si hay más mensajes que contactos únicos
            const uniqueRecipients = new Set(messagesForJob.map(m => m.to));
            console.log(`   Destinatarios únicos: ${uniqueRecipients.size}`);
            
            if (messagesForJob.length > uniqueRecipients.size) {
                const diff = messagesForJob.length - uniqueRecipients.size;
                console.log(`   🚨 HAY ${diff} MENSAJES DUPLICADOS EN ESTE JOB`);
                
                // Encontrar cuáles están duplicados
                const recipientCounts = {};
                messagesForJob.forEach(m => {
                    recipientCounts[m.to] = (recipientCounts[m.to] || 0) + 1;
                });
                
                const duplicated = Object.entries(recipientCounts)
                    .filter(([to, count]) => count > 1)
                    .sort((a, b) => b[1] - a[1]);
                
                console.log(`\n   Números que recibieron múltiples mensajes:`);
                duplicated.slice(0, 5).forEach(([to, count]) => {
                    const phone = to.replace('@c.us', '');
                    console.log(`      • ${phone}: ${count} mensajes`);
                });
            } else {
                console.log(`   ✅ No hay duplicados en este job`);
            }
        }

        // === RESUMEN ===
        console.log('\n\n📊 RESUMEN DE DIAGNÓSTICO\n');
        console.log('═'.repeat(60));
        
        const totalDuplicates = duplicateMessages.length;
        const totalContactDupes = duplicateContacts.length;
        
        if (totalDuplicates === 0 && totalContactDupes === 0) {
            console.log('\n✅ NO SE DETECTARON PROBLEMAS DE DUPLICACIÓN\n');
        } else {
            console.log('\n🚨 PROBLEMAS DETECTADOS:\n');
            
            if (totalDuplicates > 0) {
                console.log(`   ❌ ${totalDuplicates} casos de mensajes duplicados en BD`);
            }
            
            if (totalContactDupes > 0) {
                console.log(`   ⚠️ ${totalContactDupes} teléfonos tienen múltiples contactos`);
            }
            
            console.log('\n💡 CAUSAS POSIBLES:\n');
            console.log('   1. Array de contacts con IDs duplicados al crear job');
            console.log('   2. Mismo contacto agregado múltiples veces en frontend');
            console.log('   3. Deduplicación no funcionando correctamente');
            console.log('   4. Job reintentado/reiniciado sin limpiar mensajes previos');
            console.log('   5. Índice único no aplicado en modelo Message');
        }

        console.log('\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

function normalizePhone(raw) {
    let digits = String(raw || "").replace(/\D/g, "");
    digits = digits.replace(/^0+/, "");
    if (digits.startsWith("15")) digits = digits.slice(2);
    if (digits.startsWith("54") && !digits.startsWith("549")) {
        digits = "549" + digits.slice(2);
    }
    if (!digits.startsWith("54")) {
        digits = "549" + digits;
    }
    return digits;
}

diagnoseDuplicates();
