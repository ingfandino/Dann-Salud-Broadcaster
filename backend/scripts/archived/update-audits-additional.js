// Script para actualizar auditorías adicionales con scheduledAt y datosExtra
require('dotenv').config();
const mongoose = require('mongoose');
const Audit = require('./src/models/Audit');

// Función para parsear fecha en formato D/M/YYYY o DD/MM/YYYY
function parseFecha(fechaStr) {
    if (!fechaStr) return null;
    
    const parts = fechaStr.split('/');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    // Crear fecha en formato ISO (YYYY-MM-DD)
    const date = new Date(year, month - 1, day, 10, 0, 0);
    
    return date;
}

async function main() {
    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // Datos a actualizar (CUIL, Fecha, DatosExtra)
        const updates = [
            { cuil: '20457507365', fecha: '1/11/2025', datosExtra: 'ING SOLO/ CN OK/ CODEM OK/ VIDEO OK/ ALTA TEMPRANA OK/ SAB TRAB EN BLANCO OK/ SEPTIEMBRE C ANSS/ NO DEJA OPCIONAR POR SUELDO BAJO' },
            { cuil: '20475709374', fecha: '1/11/2025', datosExtra: 'VENDIDO Y VALIDADO POR ABRIL CENTURION/ DECLARA INGRESAR SOLO DE MOMENTO YA QUE TIENE UNA HIJA QUE ESTA POR NACER ENTRE EL25 Y 29 DE NOVIEMBRE /  ELI DIJO ESPERAR A QUE NAZCA EL BEBE' },
            { cuil: '20403766535', fecha: '3/11/2025', datosExtra: '' },
            { cuil: '20457826568', fecha: '3/11/2025', datosExtra: 'VENDIDA POR GRUPO SANTIAGO GOLDSTEIN/ DEESIRE MARTINEZ A MEPLIFE' },
            { cuil: '27456883392', fecha: '3/11/2025', datosExtra: 'RECHAZADO BINIMED POR CAMBIO DE GENERO' },
            { cuil: '20478065451', fecha: '3/11/2025', datosExtra: ' NO RECONOCE LA CLAVE' },
            { cuil: '20453911226', fecha: '3/11/2025', datosExtra: 'FALTA CLAVE Y DOCUMENTACION, se estaba yendo al trabajo dijo tener 10 min para realizarlo , no llegó. Estaba literalmente haciéndolo en la calle mientras se ina' },
            { cuil: '20453990797', fecha: '3/11/2025', datosExtra: ' FALTA CLAVE Y DORSO DNI se quedo sin bateria' },
            { cuil: '20460109192', fecha: '3/11/2025', datosExtra: '' },
            { cuil: '20441615338', fecha: '3/11/2025', datosExtra: ' CORTO LA LLAMADA' },
            { cuil: '20439743671', fecha: '3/11/2025', datosExtra: ' No quiso pasar la clave' },
            { cuil: '27441074471', fecha: '3/11/2025', datosExtra: 'APROBADA EN BINI PENDIENTE DE CLAVE PARA QR' },
            { cuil: '27445131178', fecha: '3/11/2025', datosExtra: ' BAJA LABORAL 02-10 Y ALTA EL MISMO DIA CON EL MISMO EMPLEADOR / LOS APORTES BAJN DE 22 MIL A 8 MIL / SE ESPERA A QUE SE ACTUALICEN LOS APORTES. SE ACTULIZO OCTUBRE SIN ANSSAAL PERO ESTA DE LICENCIAPERO PAGO ' },
            { cuil: '20948724821', fecha: '3/11/2025', datosExtra: 'VIENDO SABANA ACTUALIZADA REGISTRA BAJA LABORAL SE NOTA EN SU SABANA PERO TIENE NUEVA ALTA DEL 9/10 OCTUBRE SIN ANSSAL 14/11TIENE UN MES Y ESTA EN ROJO ' },
            { cuil: '27455254200', fecha: '3/11/2025', datosExtra: 'TIENE BAJA LABORAL 10/10/2025 CON NVA ALTA 13/1/2025 CON BAJA PROGRAMADA 31/11/2025/ REVENDER A BINIMEDSE PASO AL EXCEL DE GASTON ' },
            { cuil: '23426180464', fecha: '3/11/2025', datosExtra: 'ING CON EL HIJO/ NO SE PUEDE DESCARGAR SABANA Y DDJJ PEDI REVENDERLA A BINI CON ULTIMO RECIBO DE SUELDO' },
            { cuil: '20461228128', fecha: '3/11/2025', datosExtra: 'DOC. OK / VIDEO OK / ING. SOLO / APORTES SEP. CON ANSSAL / PESO: 100 ALTURA 1,58 / SE CONSULTA EN EL GRUPO DE ADM. POR SOBREPESO / ELIANA PIDIO QUE SE PASE A BINIMED.' },
            { cuil: '20440947302', fecha: '3/11/2025', datosExtra: '' },
            { cuil: '23448682714', fecha: '3/11/2025', datosExtra: 'TIENE ALTA CON NUEVO EMPLEADOR EL 25-10,SE ESPERA ACTUALIZACIÓN DE APORTES' },
            { cuil: '23427272184', fecha: '3/11/2025', datosExtra: ' TIENE UN APORTE UN PAGO PERO MUY BAJITO ESPERAR PROXIMO MES/ TIENE OTRO EMPLEO QUE TIENE TODO IMPAGO' },
            { cuil: '23481022509', fecha: '4/11/2025', datosExtra: 'ALTA 12/25 CON OTRA OBRA SOCIAL' },
            { cuil: '20437348511', fecha: '4/11/2025', datosExtra: 'HABLO GASTON 4/11 DICE QUE TIENE EL PREQUIRURGICO// TIENE QUE OPERARSE DE UNA FISTULA ANAL/ QUEDA EN REVISION POR ELI/ DIJO ELI QUE NO SI SE TIENE QUE OPERAR PERO PREG IGUALMENTE EN LA CENTRAL PARA SABER A FUTURO' },
            { cuil: '20471315843', fecha: '4/11/2025', datosExtra: 'FALTA CLAVE POR QUE NO LE RECONOCE EL ROSTRO' },
            { cuil: '20459105019', fecha: '4/11/2025', datosExtra: 'Falta clave, no le dejaba intentar porque le salía error al intentar ingresar en la opción de solicitar y recuperar clave' },
            { cuil: '20471262472', fecha: '4/11/2025', datosExtra: 'SE METIO LA MADRE' },
            { cuil: '27447088733', fecha: '4/11/2025', datosExtra: ' MAÑANA ENTREGA DNI Y CLAVE' },
            { cuil: '20435097260', fecha: '4/11/2025', datosExtra: 'APROBADA EN MEP' },
            { cuil: '20454171404', fecha: '4/11/2025', datosExtra: 'SAB TRAB EN BLANCO OK/ NO SE PUEDE VISUALIZAR SU SABANA Y SU DDJJ SE SOLICITO RECIBO DE SUELDO' },
            { cuil: '20474123112', fecha: '4/11/2025', datosExtra: 'TIENE 3 EMPLEADORES PERO NO SUPERAN LOS $1,500 DE APORTES / NO SE DEJA OPCIONAR.' },
            { cuil: '24462722040', fecha: '4/11/2025', datosExtra: ' FALTA CLAVE,NO RECONOCE LA CARA AL HACERLA / MATEO ENVIA LA CLAVE/ 2 EMPLEADORES, UNO CON 3 APORTES Y TODOS IMPAGOS DE $1500 Y EL OTRO UN SOLO APORTE DE $950./ NO TIENE BAJA LABORAL.' },
            { cuil: '20437283304', fecha: '4/11/2025', datosExtra: 'SE QUIERE AUTOVINCULAR' },
            { cuil: '27442628179', fecha: '5/11/2025', datosExtra: 'FALTA CLAVE NO LE VALIDABA LOS GESTOS' },
            { cuil: '23466331309', fecha: '5/11/2025', datosExtra: ' NO RECONOCE LA CLAVE ENVIADA.' },
            { cuil: '20460095523', fecha: '5/11/2025', datosExtra: 'FALTA CLAVE NO RECONOCE LOS DATOS BIOMETRICOS' },
            { cuil: '23462084544', fecha: '5/11/2025', datosExtra: 'CODEM TIENE OSECAC COMO TITULAR Y METALURGICOS COMO ADHERENTE EN EL CUAL FIGURA COMO HIJO DE CONYUGE (TEMA DISCAPACIDAD)/ VIDEO OK/ FALTA CLAVE' },
            { cuil: '20474842615', fecha: '5/11/2025', datosExtra: '/ Falta clave porque no reconoce el rostro' },
            { cuil: '20471309290', fecha: '5/11/2025', datosExtra: ' / SANTIAGO NOS DICE QUE NO SE LE HAGA EL QR POR QUE TIENE QUE ESPERAR QUE LE LLEGUEN UNOS ESTUDIOS.' },
            { cuil: '20450764729', fecha: '6/11/2025', datosExtra: 'Le aconsejaron tomar está medicación en teoría para prevenir en el caso q tenga HIV,Xq tuvo un percance personal/ LA DEJO DE TOMAR POR DECISION PERSONAL NO DE UN MEDICO' },
            { cuil: '27423683878', fecha: '6/11/2025', datosExtra: 'VENDIDA Y VALIDADA POR GABRIEL VOLLONO Embarazo 9 semanas y 5 días 26/ 11 turno con obstetra , entra con la hija/ RECHAZADA POR ELIANA' },
            { cuil: '27436271609', fecha: '6/11/2025', datosExtra: '. Declara estar en un tratamiento por alergia que consiste en aplicarse inyecciones. El tratamiento dura tres años y hace ocho meses que lo realiza.' },
            { cuil: '20433094604', fecha: '6/11/2025', datosExtra: '' },
            { cuil: '20447132460', fecha: '6/11/2025', datosExtra: ' NO RECONOCE LA CLAVE ENVIADO.' },
            { cuil: '20443962418', fecha: '6/11/2025', datosExtra: '/ NO QUISO PASAR LA CLAVE Y CORTO.' },
            { cuil: '20416689319', fecha: '6/11/2025', datosExtra: 'Se operó en el 2023 de tibia y peroné ( derecho) 1 placa y 3 clavos, vida normal y no tiene q volver a operarse/FALTA CLAVE Tiene la app de mi argentina, de igual manera dudo q se puede generar la clave' },
            { cuil: '20399857547', fecha: '6/11/2025', datosExtra: 'FALTA DOCUMENTACION Y CLAVE' },
            { cuil: '20433252285', fecha: '6/11/2025', datosExtra: '' },
            { cuil: '20472326733', fecha: '6/11/2025', datosExtra: 'OP JUN 2025 DE LIGAMENTOS CRUZADOS Y MEÑISCOS ESTA HACIENDO REHABILITACION HASTA JUN DEL 2026/ NO PUEDE HACER DEPORTE PERO TIENE EL ALTA PARA EL TRABAJO/SUPUESTAMENTE LO VA A REALIZAR CON IOMA QUE TIENE LA MADRE ULTIMO RECIBO DE SUELDO/NO RECONOCE CLAVE ENVIADA' },
            { cuil: '27447887385', fecha: '6/11/2025', datosExtra: 'Le entregan el DNI nuevo la semana q viene' },
            { cuil: '20464221612', fecha: '6/11/2025', datosExtra: ' NO RECONOCE CLAVE ENVIADA POR PAOLA' },
            { cuil: '27482303264', fecha: '6/11/2025', datosExtra: ' Sin clave porque se cortó el internet en medio de la auditoría' },
            { cuil: '20420220821', fecha: '6/11/2025', datosExtra: ' FALTA DNI Y CLAVE' },
            { cuil: '23453013189', fecha: '6/11/2025', datosExtra: 'APROBADA NO RECONOCE CLAVE' },
            { cuil: '27463461037', fecha: '6/11/2025', datosExtra: 'APROBADA NO RECONOCE CLAVE' },
            { cuil: '20428904789', fecha: '6/11/2025', datosExtra: 'TIENE BAJA LABORAL SIN ALTA NUEVA' },
            { cuil: '20280731316', fecha: '6/11/2025', datosExtra: ' HIJO CON DISPACIDAD EN EL CODEM ' },
            { cuil: '27454283762', fecha: '6/11/2025', datosExtra: 'tiene escoliosis, pero no hace nada porque es muy reciente. Hay que verificar bien los porcentajes de desviación y en qué otra parte del cuerpo le llega a impactar la escoliosis. TENEMOS UN AUDIO DONDE INDICA MARCELO QUE SE TIENE QUE OPERAR/' },
            { cuil: '27455759396', fecha: '7/11/2025', datosExtra: '/ LE CUENTA A SUPERVISOR Y AL VENDEDOR POR ERROR DE JIMENA QUE LE HIZO EL QR EN BINIMED PORQUE LA VENDIO GASTON AL OTRO DIA LE CUENTA A AMBOS' },
            { cuil: '23438584099', fecha: '7/11/2025', datosExtra: ' NO RECONOCE CLAVE ENVIADA' },
            { cuil: '27416620119', fecha: '7/11/2025', datosExtra: '' },
            { cuil: '20430432347', fecha: '7/11/2025', datosExtra: '' },
            { cuil: '27461581450', fecha: '7/11/2025', datosExtra: ' Falta clave porque le salía DNI vencido o fallo del sistema Probó con 2 teléfonos' },
            { cuil: '20445075311', fecha: '7/11/2025', datosExtra: 'FALTA AUDITORIA Y CLAVE CORTO EL LLAMADO' },
            { cuil: '27964203038', fecha: '7/11/2025', datosExtra: 'PESA 78 MIDE 1,64/ INGRESA SOLA/ VIDEO OK TOMA PASTILLA ANTICONCEPTIVAS NADA MAS/ CODEM OK/ CN OK/ ALTA TEMPRANA OK DE UN EMPLEO NUEVO QUE TIENE EN JUNIO PERO ESTA IMPAGO PRESENTAR CUANDO ESTE PAGO Y TIENE QUE EMPADRONARSE / SE PASA A ADMIN. 7/11' },
            { cuil: '20960651457', fecha: '7/11/2025', datosExtra: 'APORTES HASTA MAYO / MYO CON ANSSAL// BAJA 31/5/2025 RENUNCIO/ SE DEJA PRECARGAR/ GASTON DICE QUE TIENE EMPLEO NVO EMPEZO EL 2 DE JUNIO/ JUNIO N O PRESENTADA/ NO REGISTRA ALTA DE NINGUN EMPLEO / 7/11 PASADA AL EXCEL DE GASTON ' },
            { cuil: '27423699626', fecha: '7/11/2025', datosExtra: 'EL MISMO APORTE DURANTE TODO EL AÑO. NO PROCESE CARPETA/RECUPERARON CLAVE HOY PERO TIENE BAJO APORTES APORTE DESDE ABRIL NO PRESENTADO 7/11 PASAD AL EXCEL DE GASTON NVO EMPLEO ' },
            { cuil: '20405355168', fecha: '7/11/2025', datosExtra: 'DOC OK / VIDEO OK / INGRESA SOLO / APORTES MUY BAJOS. TODO EL AÑO/ JUNIO NO PRESENTADO 7/11 MES 8 PRESENTADO PERO APORTES BAJO DE $824,66 pasada al excel de gaston ' },
            { cuil: '20389594343', fecha: '7/11/2025', datosExtra: 'RECUPERO CLAVE GASTY/ CAMBIO CLAVE EL CLIENTE/ MIDE 165 PESA 75 TIENE ALTA EL 6/8 ESPERAR A QUE IMPACTE EL APORTE DE AGOSTO / YA APARECE EL APORTE DE AGOSTO PERO SIN NO RECONOCE LA CLAVE 22/09 PASADA A GASTON 7/11/ EMPLEO CO DOS MESES ' },
            { cuil: '23455032229', fecha: '7/11/2025', datosExtra: 'CODEM NO ARROJA DATOS/ VIDEO OK / DOC. OK / PESO 63 KG Y MIDE 1,73 / SE SUBE A SISTEMA./ SE RECHAZA POR QUE EL UNICO APORTE ESTA IMPAGO./ ESPERAR QUE ESTE PAGO/TRES APORTES TRES IMPAGOS 28/10 PASADO AL EXCEL DE GASDTON ' },
            { cuil: '20435182330', fecha: '7/11/2025', datosExtra: 'BAJA 31/8/2025 Y TIENE UN ALTA 1/9/2025I CON BAJA EL 19/9 NGRESA SOLO /TIENE 23 AÑOS MIDE 1,76 Y PESA 71 KG/ CODEM OK/ CN OK/ ALTA TEMPRANA OK/SEP CON ANSSAL// VIDEO OK/ ELI DIJO DE SUBIRLA/ VOLVER A CARGAR DIJERON EL 8/9 DESDE EL 2/9/me la rechazan del sistema porque el último mes figura como que no trabaja mas 22/9 18/11' },
            { cuil: '23457428014', fecha: '7/11/2025', datosExtra: 'ESTABA EN REMUNERACION/TIENE BAJA LABORAL 26/6/2025/ APORTES BAJOS TODO EL AÑO/ CODEM OK/ VIDEO OK APORTE AGOSTO/ 07/10 SEPTIEMBRE SIN ANSAL SALIO DE REMUNERACION NO TIENE CERTIFICADO EMITIVO LABORAL AHU TIENE TIENE BAJO A PORTES Y DE GOLPE TIENE UN POCO MAS DE LO AVITUAL / BAJA LABOR 27/9 ' },
            { cuil: '20471992047', fecha: '7/11/2025', datosExtra: 'PRESENTA BAJA LABORAL SIN NUEVAS ALTAS/ CN OK/ CODEM OK/ VIDEO OK/ DOCUMENTACION OK' },
            { cuil: '27425952019', fecha: '7/11/2025', datosExtra: 'PRESENTA BAJA LABORAL SIN NUEVAS ALTAS/ CN OK/ CODEM OK/ VIDEO OK/ DOCUMENTACION OK' },
            { cuil: '27448701129', fecha: '7/11/2025', datosExtra: 'ING SOLA/ CN OK/ CODEM OK/ VIDEO OK/ FALTA CLAVE / GASTON RECUPERA CLAVE / TIENE BAJA LABORAL SIN NUEVA ALTA APORTES HASTA AGOSTO.' },
            { cuil: '27436290743', fecha: '7/11/2025', datosExtra: 'ING CON EL HIJO NO FIGURA EN CODEM/ CN OK/ VIDEO OK/ Se quiere autovincular mañana a las 11 FALTA SABANA Y DDJJ ANTES DE APROBAR LA AUTOVINCULACION SOLICITAR REAUDITORIA POR QUE DICE DOMICILIO PERO NO LOCALIDAD' },
            { cuil: '20419190609', fecha: '7/11/2025', datosExtra: 'JULIO AGOSTO Y SEPT IMPAGOS/CN OK / CODEM OK/ ING SOLO/ VIDEO OK' },
            { cuil: '27441282392', fecha: '7/11/2025', datosExtra: 'DOC. OK / VIDEO OK / ING. SOLA / APORTES OCT. CON ANSSAL / SE AUTOVINCULA HOY 07/11 A LAS 17:30 HS.' }
        ];

        let updated = 0;
        let notFound = 0;
        let errors = 0;

        for (const update of updates) {
            try {
                const { cuil, fecha: fechaStr, datosExtra } = update;

                // Buscar auditoría por CUIL
                const audit = await Audit.findOne({ cuil });

                if (!audit) {
                    console.warn(`⚠️  No se encontró auditoría con CUIL: ${cuil}`);
                    notFound++;
                    continue;
                }

                // Parsear fecha
                const fechaParsed = parseFecha(fechaStr);

                // Actualizar auditoría
                if (fechaParsed) {
                    audit.scheduledAt = fechaParsed;
                }
                
                // Actualizar datosExtra si existe
                if (datosExtra !== undefined) {
                    audit.datosExtra = datosExtra;
                }

                await audit.save();

                console.log(`✅ Actualizado: CUIL ${cuil} - Fecha: ${fechaStr}, DatosExtra: ${datosExtra ? 'Sí' : 'Vacío'}`);
                updated++;

            } catch (err) {
                console.error(`❌ Error procesando CUIL ${update.cuil}:`, err.message);
                errors++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN:');
        console.log(`   ✅ Actualizadas: ${updated}`);
        console.log(`   ⚠️  No encontradas: ${notFound}`);
        console.log(`   ❌ Errores: ${errors}`);
        console.log('='.repeat(60));

    } catch (err) {
        console.error('❌ Error fatal:', err);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

main();
