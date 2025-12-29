// Script para actualizar auditorías existentes con datos de Auditor, Estado y Fecha
require('dotenv').config();
const mongoose = require('mongoose');
const Audit = require('./src/models/Audit');
const User = require('./src/models/User');

// Función para parsear fecha en formato DD/MM/YYYY o MM/DD/YYYY
function parseFecha(fechaStr) {
    if (!fechaStr) return null;
    
    const parts = fechaStr.split('/');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    // Crear fecha en formato ISO (YYYY-MM-DD)
    // Asumimos formato DD/MM/YYYY (común en Latinoamérica)
    const date = new Date(year, month - 1, day, 10, 0, 0); // 10:00 AM hora local
    
    return date;
}

async function main() {
    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // Cargar todos los usuarios
        console.log('\n📋 Cargando usuarios...');
        const allUsers = await User.find({});
        console.log(`✅ ${allUsers.length} usuarios cargados`);

        // Datos a actualizar (CUIL, Auditor, Estado, Fecha)
        const updates = [
            { cuil: '27456341611', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '20514089389', auditor: 'Mateo Viera', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '20436652101', auditor: 'Joaquin Valdez', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '27944413222', auditor: 'Aryel Puiggros', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '27471842562', auditor: 'Aryel Puiggros', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '20467412052', auditor: 'Tiziana Ayelen Requeijo', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '20467486544', auditor: 'Belen Salaverry', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '23471859729', auditor: 'Joaquin Valdez', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '27456785439', auditor: 'Joaquin Valdez', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '27452880763', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '27471155816', auditor: 'Nahuel Sanchez', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '27444851290', auditor: 'Gaston Sarmiento', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '20453040454', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '23469575144', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '27451475334', auditor: 'Joaquin Valdez', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '27466299052', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '20456131728', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '20468218144', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '20474160093', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '27457389693', auditor: 'Santiago Goldsztein', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '20468921856', auditor: 'Santiago Goldsztein', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '23459123199', auditor: 'Erika Cardozo', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '20459237381', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '20461082824', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '27462867579', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '20483729473', auditor: 'Joaquin Valdez', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '20439006820', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '27411695323', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '20471256006', auditor: 'Nahuel Sanchez', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '27476795538', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '27454005843', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '27453258799', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '23469380009', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '27452197141', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '20474305229', auditor: 'Nahuel Sanchez', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '27452841784', auditor: 'Joaquin Valdez', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '20467525213', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '20476899843', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/3/2025' },
            { cuil: '20437335738', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '27334347880', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '27430511209', auditor: 'Analia Suarez', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '27456224704', auditor: 'Luciano Carugno', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '27453181990', auditor: 'Luciano Carugno', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20461227776', auditor: 'Luciano Carugno', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20423685787', auditor: 'Luciano Carugno', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '27456838435', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20403947947', auditor: 'Taiana Zorrilla', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20959220515', auditor: 'Luciano Carugno', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20470634368', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '27454644080', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20412055730', auditor: 'Analia Suarez', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20445888177', auditor: 'Taiana Zorrilla', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20446897986', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '27456887908', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20417649515', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20460208956', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20452340381', auditor: 'Luciano Carugno', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20462040556', auditor: 'Luciano Carugno', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20462907614', auditor: 'Aryel Puiggros', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '27449685739', auditor: 'Kyara Stebner', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20458127264', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20466805948', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '27463501527', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20474854788', auditor: 'Nahia Avellaneda', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20469131409', auditor: 'Aryel Puiggros', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20469140971', auditor: 'Aryel Puiggros', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20341370559', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '27474789352', auditor: 'Daniel Fandiño', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20473140625', auditor: 'Joaquin Valdez', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20476362866', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20450676889', auditor: 'Nahuel Sanchez', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20404906578', auditor: 'Gaston Sarmiento', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '27433324027', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20471677141', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20442543608', auditor: 'Nahuel Sanchez', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20453070736', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20474007775', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '23318357439', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/4/2025' },
            { cuil: '20434624879', auditor: 'Mateo Viera', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '27369051070', auditor: 'Mateo Viera', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '20465575884', auditor: 'Santiago Goldsztein', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '20474930263', auditor: 'Belen Salaverry', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '20472930363', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '20313500773', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '20445441717', auditor: 'Tiziana Ayelen Requeijo', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '20462065397', auditor: 'Luciano Carugno', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '20439196425', auditor: 'Mateo Viera', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '20539816021', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '27406077271', auditor: 'Aryel Puiggros', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '20471322955', auditor: 'Nahia Avellaneda', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '20450735044', auditor: 'Nahuel Sanchez', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '20472201825', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '27456264307', auditor: 'Joaquin Valdez', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '20460275793', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '20472289757', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '20419818152', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '20473080533', auditor: 'Santiago Goldsztein', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '27478293858', auditor: 'Tiziana Ayelen Requeijo', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '20462050292', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '27443270049', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '20471381528', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/5/2025' },
            { cuil: '20408711135', auditor: 'Erika Cardozo', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20472361474', auditor: 'Aryel Puiggros', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '27461946785', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20456796657', auditor: 'Tiziana Ayelen Requeijo', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '23458734879', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '27452969098', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '27445473656', auditor: 'Nahia Avellaneda', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20436658037', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20456797106', auditor: 'Mateo Viera', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20428362668', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '27454754781', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20446123034', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '23418902809', auditor: 'Nahuel Sanchez', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '27467028362', auditor: 'Joaquin Valdez', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20434576254', auditor: 'Nahuel Sanchez', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20459395076', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20460889643', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '27470933602', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20465624222', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20435715193', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '27468171924', auditor: 'Santiago Goldsztein', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20463597023', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20479654671', auditor: 'Nahuel Sanchez', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20457388935', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20426717604', auditor: 'Santiago Goldsztein', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20465575191', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20458710695', auditor: 'Nahuel Sanchez', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '23465847069', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '27477476274', auditor: 'Belen Salaverry', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '23451476599', auditor: 'Nahuel Sanchez', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '27462747387', auditor: 'Nahuel Sanchez', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20454153252', auditor: 'Mateo Viera', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '27461229110', auditor: 'Kyara Stebner', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '23469882349', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '27466000278', auditor: 'Joaquin Valdez', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20436290374', auditor: 'Abigail Vera', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '27434445464', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20444854961', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20461103082', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20453033555', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20454803893', auditor: 'Nahia Avellaneda', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20421368709', auditor: 'Aryel Puiggros', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20342721134', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20453961231', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20467496892', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20465854805', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '27481723685', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20508504633', auditor: 'Erika Cardozo', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '27460995189', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '23430967509', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20452980070', auditor: 'Aryel Puiggros', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20456872345', auditor: 'Nahuel Sanchez', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20434007462', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/6/2025' },
            { cuil: '20453106277', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '23471847194', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '20454815840', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '27336534912', auditor: 'Nahuel Sanchez', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '20447643279', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '20400106941', auditor: 'Mateo Viera', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '20472362802', auditor: 'Joaquin Valdez', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '27480255211', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '20406202993', auditor: 'Nahuel Sanchez', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '20449641753', auditor: 'Santiago Goldsztein', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '27482146185', auditor: 'Nahuel Sanchez', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '20475744110', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '27478034674', auditor: 'Santiago Goldsztein', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '20302731943', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '20476532524', auditor: 'Aryel Puiggros', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '20371622269', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '20417255258', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '27449366382', auditor: 'Tiziana Ayelen Requeijo', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '23380274094', auditor: 'Santiago Goldsztein', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '20445049825', auditor: 'Nahuel Sanchez', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '20450722996', auditor: 'Marcelo', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '20473417228', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '27477506130', auditor: 'Analia Suarez', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '20449663625', auditor: 'Analia Suarez', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '20457361204', auditor: 'Joaquin Valdez', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '27455236342', auditor: 'Laura Gamboa', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '27462848639', auditor: 'Joaquin Valdez', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '27452025391', auditor: 'Paola Fernandez', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '20442142565', auditor: 'Nahia Avellaneda', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '23457491654', auditor: 'Santiago Goldsztein', estado: 'QR hecho', fecha: '11/7/2025' },
            { cuil: '27466982178', auditor: 'Nahuel Sanchez', estado: 'QR hecho', fecha: '11/7/2025' }
        ];

        let updated = 0;
        let notFound = 0;
        let errors = 0;

        for (const update of updates) {
            try {
                const { cuil, auditor: auditorName, estado, fecha: fechaStr } = update;

                // Buscar auditoría por CUIL
                const audit = await Audit.findOne({ cuil });

                if (!audit) {
                    console.warn(`⚠️  No se encontró auditoría con CUIL: ${cuil}`);
                    notFound++;
                    continue;
                }

                // Resolver auditor por nombre
                let auditorId = null;
                if (auditorName) {
                    const auditor = allUsers.find(u =>
                        u.nombre?.toLowerCase().trim() === auditorName.toLowerCase().trim()
                    );

                    if (!auditor) {
                        console.warn(`⚠️  Auditor "${auditorName}" no encontrado para CUIL ${cuil}`);
                    } else {
                        auditorId = auditor._id;
                    }
                }

                // Parsear fecha
                const fechaParsed = parseFecha(fechaStr);

                // Actualizar auditoría
                audit.auditor = auditorId;
                audit.status = estado || '';
                if (fechaParsed) {
                    audit.scheduledAt = fechaParsed;
                }

                await audit.save();

                console.log(`✅ Actualizado: CUIL ${cuil} - Auditor: ${auditorName || 'N/A'}, Estado: ${estado}, Fecha: ${fechaStr}`);
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
