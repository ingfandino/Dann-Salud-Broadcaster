// Script para actualizar auditorías existentes con datos de Auditor y Estado
require('dotenv').config();
const mongoose = require('mongoose');
const Audit = require('./src/models/Audit');
const User = require('./src/models/User');

const csvData = `Nombre de afiliado,CUIL,Teléfono,Tipo de venta,Obra social anterior,Obra social vendida,Fecha,Asesor,Validador,Supervisor,Datos extra (opcional),Auditor,Estado
RIVEROS ARAYA ARACELI ORIANA,27456341611,1158286887,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Morena Ledesma,Santiago Goldsztein,Santiago Goldsztein,,Laura Gamboa,QR hecho
ROMERO FABRIZIO JOEL,20514089389,1173678681,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Candela Cosentino,Mateo Viera,Mateo Viera,,Mateo Viera,QR HECHO
FLEITAS MAXIMILIANO JAVIER,20436652101,1158507859,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Oriana Russo,Abigail Vera,Abigail Vera,,Joaquin Valdez,QR HECHO
CORREA CARNEIRO SONIA PATRICIA,27944413222,1153785049,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Aryel Puiggros,Aryel Puiggros,Aryel Puiggros,,Aryel Puiggros,QR HECHO
DIAZ DAFNE ABIGAIL,27471842562,1122793923,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Nicole Saravia,Aryel Puiggros,Aryel Puiggros,,Aryel Puiggros,QR HECHO
LOPEZ JUAN CRUZ ALEJANDRO,20467412052,1131201112,alta,OSUTHGRA (108803),BINIMED,11/3/2025,AgustIn Miqueo,Santiago Goldsztein,Santiago Goldsztein,,Tiziana Ayelen Requeijo,QR HECHO
MALAGON GABRIEL ADRIAN,20467486544,1136095176,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Juliana Baez,Belen Salaverry,Belen Salaverry,,Belen Salaverry,QR HECHO
ZIEBA MARIANO ANTONIO,23471859729,1139249763,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Matias Del Mul,Joaquin Valdez,Joaquin Valdez,,Joaquin Valdez,QR HECHO
SOSA FERNANDA LUDMILA,27456785439,1144365848,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Sabrina Castro,Joaquin Valdez,Joaquin Valdez,,Joaquin Valdez,QR HECHO
LUNA LUCIA MEDELIS,27452880763,1139219481,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Matias Del Mul,Joaquin Valdez,Joaquin Valdez,,Marcelo,QR HECHO
VERON ABIGAIL TABATHA,27471155816,1124035924,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Daira Cabrera,Nahia Avellaneda,Nahia Avellaneda,,Nahuel Sanchez,QR HECHO
PONCE KAREN SOFIA,27444851290,1128421822,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Joaquin Mariscal,Gaston Sarmiento,Gaston Sarmiento,,Gaston Sarmiento,QR HECHO
DEL PRESTAMO GONZALO JOEL,20453040454,1135869608,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Franco Terenzano Rodriguez,Mateo Viera,Mateo Viera,,Marcelo,QR HECHO
PIEDRABUENA SELENE TAMARA,23469575144,1150608097,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Tatiana Luna,Nahia Avellaneda,Nahia Avellaneda,,Laura Gamboa,QR HECHO
GONZALEZ HAIDBANXXER KIARA,27451475334,1133035405,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Nicole Saravia,Aryel Puiggros,Aryel Puiggros,,Joaquin Valdez,QR HECHO
LUQUEZ SCIANCALEPORE MARTINA GIOVANNA,27466299052,1124932836,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Kyara Stebner,Santiago Goldsztein,Santiago Goldsztein,,Laura Gamboa,QR HECHO
NICCOLINI TIZIANO ARIEL,20456131728,1126449751,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Luka Menguez,Nahia Avellaneda,Nahia Avellaneda,,Paola Fernandez,QR HECHO
VACAS ELIAS NICOLAS,20468218144,1128166214,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Franco Terenzano Rodriguez,Mateo Viera,Mateo Viera,,Marcelo,QR HECHO
RUIZ IGNACIO GABRIEL,20474160093,1136318594,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Naiara Jorge,Abigail Vera,Abigail Vera,,Marcelo,QR HECHO
FERNANDEZ KEILA MILAGROS,27457389693,1123007652,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Pablo Wade,Nahia Avellaneda,Nahia Avellaneda,,Santiago Goldsztein,QR HECHO
SALVADOR LAUTARO AGUSTIN,20468921856,1136857597,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Franco Terenzano Rodriguez,Mateo Viera,Mateo Viera,,Santiago Goldsztein,QR HECHO
RAMIREZ PEDRO VALENTIN,23459123199,1124330127,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Erika Cardozo,Erika Cardozo,Erika Cardozo,,Erika Cardozo,QR HECHO
DUARTE FRANCO JOAQUIN,20459237381,1126275292,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Franco Terenzano Rodriguez,Mateo Viera,Mateo Viera,,Laura Gamboa,QR HECHO
ASTUDILLO IAN ELIO EXEQUIEL,20461082824,1158699114,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Luciana Vocal,Mateo Viera,Mateo Viera,,Paola Fernandez,QR HECHO
CELOT MORA DOMINIQUE,27462867579,1166142694,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Luca Avenali,Belen Salaverry,Belen Salaverry,,Laura Gamboa,QR HECHO
FERNANDEZ IAGO EMANUEL,20483729473,1122889521,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Ailen Montes,Aryel Puiggros,Aryel Puiggros,,Joaquin Valdez,QR HECHO
MENDOZA WALTER ESTEBAN,20439006820,1155086241,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Rocio Romero,Mateo Viera,Mateo Viera,,Paola Fernandez,QR HECHO
CORONEL SASHA IVANA,27411695323,1126253560,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Agustín Maya,Facundo Tevez,Facundo Tevez,,Paola Fernandez,QR HECHO
ISIDORI TEO,20471256006,1133017092,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Tatiana Luna,Nahia Avellaneda,Nahia Avellaneda,,Nahuel Sanchez,QR HECHO
AYALA MARIA DE LOS ANGELES,27476795538,1135179450,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Luca Avenali,Belen Salaverry,Belen Salaverry,,Paola Fernandez,QR HECHO
BENITEZ DYLAN DANIEL,27454005843,1126636463,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Oriana Russo,Abigail Vera,Abigail Vera,,Paola Fernandez,QR HECHO
MACIAS URTASUN RANATA MARTINA,27453258799,1131304588,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Luca Avenali,Belen Salaverry,Belen Salaverry,,Paola Fernandez,QR HECHO
ALMADA LUCA EMMANUEL,23469380009,1133710559,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Agustin Escalante,Mateo Viera,Mateo Viera,,Paola Fernandez,QR HECHO
DELVALLE FLOR DORIS VALERIA,27452197141,1126620316,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Aryel Puiggros,Aryel Puiggros,Aryel Puiggros,,Paola Fernandez,QR HECHO
BRIGUERA FACUNDO SEBASTIÁN,20474305229,1121739581,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Tatiana Luna,Nahia Avellaneda,Nahia Avellaneda,,Nahuel Sanchez,QR HECHO
GALEANO ALMA MARTINA,27452841784,1140873708,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Matias Del Mul,Joaquin Valdez,Joaquin Valdez,,Joaquin Valdez,QR HECHO
QUATRARO LOPEZ FEDERICO,20467525213,1164008301,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Juliana Baez,Belen Salaverry,Belen Salaverry,,Paola Fernandez,QR HECHO
MANSILLA TOMAS VALENTIN,20476899843,1130527201,alta,OSUTHGRA (108803),BINIMED,11/3/2025,Candela Cosentino,Mateo Viera,Mateo Viera,,Paola Fernandez,QR HECHO
SOSA JOEL,20437335738,1131757882,alta,OSUTHGRA (108803),TURF,11/4/2025,Luca Avenali,Belen Salaverry,Belen Salaverry,,Paola Fernandez,QR HECHO
ZARATE ELIANA MAYRA,27334347880,1156036581,alta,OSUTHGRA (108803),MEPLIFE,11/4/2025,Torres Melina,Abigail Vera,Abigail Vera,,Laura Gamboa,QR HECHO
DEGREGORIO SOFIA MAGALI,27430511209,1155926782,alta,OSUTHGRA (108803),MEPLIFE,11/4/2025,Cinthia Rivero,Abigail Vera,Abigail Vera,,Analia Suarez,QR HECHO
IBAÑEZ KAREN AYELEN,27456224704,1132649971,alta,OSUTHGRA (108803),MEPLIFE,11/4/2025,Lautaro Bogado,Luciano Carugno,Luciano Carugno,,Luciano Carugno,QR HECHO
CARO GUADALUPE BELEN,27453181990,1125925645,alta,OSUTHGRA (108803),MEPLIFE,11/4/2025,Analia Suarez,Abigail Vera,Abigail Vera,,Luciano Carugno,QR HECHO
CATALANO DEMIAN GABRIEL,20461227776,1166859729,alta,OSUTHGRA (108803),MEPLIFE,11/4/2025,Lautaro Bogado,Luciano Carugno,Luciano Carugno,,Luciano Carugno,QR HECHO
TORRES EMANUEL QUIMEY,20423685787,1135970875,alta,OSUTHGRA (108803),MEPLIFE,11/4/2025,Ludmila Villalba,Luciano Carugno,Luciano Carugno,,Luciano Carugno,QR HECHO
CARRUEGO CAMILA,27456838435,1124080765,alta,OSUTHGRA (108803),MEPLIFE,11/4/2025,Marcos Miranda,Abigail Vera,Abigail Vera,,Laura Gamboa,QR HECHO
RIOS FABIAN AGUSTIN,20403947947,1126598161,alta,OSUTHGRA (108803),MEPLIFE,11/4/2025,Luca Mendelovich,Abigail Vera,Abigail Vera,,Taiana Zorrilla,QR HECHO
AGUILERA DIAZ JAIRO JESUS,20959220515,1127627800,alta,OSUTHGRA (108803),MEPLIFE,11/4/2025,Aldana Gaspar,Luciano Carugno,Luciano Carugno,,Luciano Carugno,QR HECHO
TOLEDO FACUNDO NATANAEL,20470634368,1131640014,alta,OSUTHGRA (108803),MEPLIFE,11/4/2025,Luca Mendelovich,Abigail Vera,Abigail Vera,,Paola Fernandez,QR HECHO
ROMERO MARIANELA DENISE,27454644080,1132991862,alta,OSUTHGRA (108803),MEPLIFE,11/4/2025,Pablo Wade,Nahia Avellaneda,Nahia Avellaneda,,Laura Gamboa,QR HECHO
YAPURA JORGE GABRIEL,20412055730,1164079819,alta,OSUTHGRA (108803),MEPLIFE,11/4/2025,Marcos Miranda,Abigail Vera,Abigail Vera,,Analia Suarez,QR HECHO
DUARTE FRANCO NEHUEN,20445888177,1167271645,alta,OSUTHGRA (108803),MEPLIFE,11/4/2025,Luca Mendelovich,Abigail Vera,Abigail Vera,,Taiana Zorrilla,QR HECHO
OJEDA EZEQUIEL ALEJANDRO,20446897986,1171224477,alta,OSUTHGRA (108803),MEPLIFE,11/4/2025,Luca Mendelovich,Abigail Vera,Abigail Vera,,Marcelo,QR HECHO
MEY MELINA ALDANA,27456887908,1126593672,alta,OSUTHGRA (108803),MEPLIFE,11/4/2025,Lautaro Bogado,Luciano Carugno,Luciano Carugno,,Marcelo,QR HECHO
MUÑOZ MAXIMILIANO,20417649515,1168660922,alta,OSUTHGRA (108803),MEPLIFE,11/4/2025,Matias Del Mul,Joaquin Valdez,Joaquin Valdez,,Marcelo,QR HECHO
GAMBA AGUSTIN DANIEL,20460208956,1170958633,alta,OSUTHGRA (108803),MEPLIFE,11/4/2025,Luca Mendelovich,Abigail Vera,Abigail Vera,,Paola Fernandez,QR HECHO
SANCHEZ DIEGO ARMANDO,20452340381,1163591458,alta,OSUTHGRA (108803),MEPLIFE,11/4/2025,Luciano Carugno,Luciano Carugno,Luciano Carugno,,Luciano Carugno,QR HECHO
OZUNA THIAGO EDGARDO,20462040556,1167526036,alta,OSUTHGRA (108803),MEPLIFE,11/4/2025,Ludmila Villalba,Luciano Carugno,Luciano Carugno,,Luciano Carugno,QR HECHO
CARBO ALEJANDRO AGUSTIN,20462907614,1161444814,alta,OSUTHGRA (108803),BINIMED,11/4/2025,Ailen Montes,Aryel Puiggros,Aryel Puiggros,,Aryel Puiggros,QR HECHO
RAMIREZ SOFIA,27449685739,1137846103,alta,OSUTHGRA (108803),BINIMED,11/4/2025,Agustín Maya,Facundo Tevez,Facundo Tevez,,Kyara Stebner,QR HECHO
SILVA CHAMARRO NAHUEL ALEXIS,20458127264,1139144718,alta,OSUTHGRA (108803),BINIMED,11/4/2025,Kyara Stebner,Santiago Goldsztein,Santiago Goldsztein,,Laura Gamboa,QR HECHO
VELASQUEZ BRANDON LAUTARO,20466805948,1168404695,alta,OSUTHGRA (108803),BINIMED,11/4/2025,Ibarra Milenka,Belen Salaverry,Belen Salaverry,,Paola Fernandez,QR HECHO
UÑATES ARIANA GABRIELA,27463501527,1159437956,alta,OSUTHGRA (108803),BINIMED,11/4/2025,Naiara Jorge,Abigail Vera,Abigail Vera,,Paola Fernandez,QR HECHO
RATTARO URIEL EZEQUIEL,20474854788,1140840771,alta,OSUTHGRA (108803),BINIMED,11/4/2025,Sabrina Castro,Joaquin Valdez,Joaquin Valdez,,Nahia Avellaneda,QR HECHO
PERALTA NAHUEL CARLOS GABRIEL,20469131409,1125151830,alta,OSUTHGRA (108803),BINIMED,11/4/2025,Sabrina Castro,Joaquin Valdez,Joaquin Valdez,,Aryel Puiggros,QR HECHO
GONZALEZ LEGUIZAMON CRISTIAN DAVID,20469140971,1171370399,alta,OSUTHGRA (108803),BINIMED,11/4/2025,Nuria Balbuena,Aryel Puiggros,Aryel Puiggros,,Aryel Puiggros,QR HECHO
CABRERA ANDRES OSVALDO,20341370559,1125845965,alta,OSUTHGRA (108803),BINIMED,11/4/2025,Milagros Krauss,Mateo Viera,Mateo Viera,,Paola Fernandez,QR HECHO
LENCINA NAIR DANIELA,27474789352,1125985662,alta,OSUTHGRA (108803),BINIMED,11/4/2025,Milagros Krauss,Mateo Viera,Mateo Viera,,Daniel Fandiño,QR HECHO
PAULUK JAVIER ESTEBAN,20473140625,1136347056,alta,OSUTHGRA (108803),BINIMED,11/4/2025,Abril Centurion,Mateo Viera,Mateo Viera,,Joaquin Valdez,QR HECHO
HERNANDEZ MORENO ADRIAN EZEQUIEL,20476362866,1126240912,alta,OSUTHGRA (108803),BINIMED,11/4/2025,Rocio Romero,Mateo Viera,Mateo Viera,,Marcelo,QR HECHO
OLIVERA ESTEBAN MAXIMILIANO,20450676889,1133857349,alta,OSUTHGRA (108803),BINIMED,11/4/2025,Marisabel Galindo,Santiago Goldsztein,Santiago Goldsztein,,Nahuel Sanchez,QR HECHO
CEPEDA ELIAS MARIO,20404906578,1136586969,alta,OSUTHGRA (108803),BINIMED,11/4/2025,Gaston Sarmiento,Gaston Sarmiento,Gaston Sarmiento,,Gaston Sarmiento,QR HECHO
LUZ MARIA TESSORE,27433324027,3764413337,alta,OSUTHGRA (108803),BINIMED,11/4/2025,Agustín Maya,Facundo Tevez,Facundo Tevez,,Paola Fernandez,QR HECHO
SANTA CRUZ ALAN EZEQUIEL,20471677141,1161906022,alta,OSUTHGRA (108803),BINIMED,11/4/2025,Naiara Jorge,Abigail Vera,Abigail Vera,,Laura Gamboa,QR HECHO
SAAVEDRA TICLAYAURI JOSE PABLO,20442543608,1136625504,alta,OSUTHGRA (108803),BINIMED,11/4/2025,Lucas Posta,Facundo Tevez,Facundo Tevez,,Nahuel Sanchez,QR HECHO
FESER CRISTIAN MAXIMILIANO,20453070736,1126834534,alta,OSUTHGRA (108803),BINIMED,11/4/2025,Mailen Yamila Viegas,Mateo Viera,Mateo Viera,,Paola Fernandez,QR HECHO
MARTINEZ BENJAMIN ANDRES,20474007775,1139264571,alta,OSUTHGRA (108803),BINIMED,11/4/2025,Agustina Lagos,Belen Salaverry,Belen Salaverry,,Laura Gamboa,QR HECHO
MAIDANA JULIO ANTONIO,23318357439,1168406896,alta,OSUTHGRA (108803),BINIMED,11/4/2025,Ibarra Milenka,Belen Salaverry,Belen Salaverry,,Laura Gamboa,QR HECHO
PROPATO CRISTIAN GABRIEL,20434624879,1153399312,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Agustin Escalante,Mateo Viera,Mateo Viera,,Mateo Viera,QR HECHO
ORTIZ MARIA FLORENCIA,27369051070,1127188546,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Mailen Yamila Viegas,Mateo Viera,Mateo Viera,,Mateo Viera,QR HECHO
SILVA FABRICIO VALENTIN,20465575884,1125439253,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Morena Ledesma,Santiago Goldsztein,Santiago Goldsztein,,Santiago Goldsztein,QR HECHO
FALCON LUCAS FERNANDO,20474930263,1127886986,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Juliana Baez,Belen Salaverry,Belen Salaverry,,Belen Salaverry,QR HECHO
GONZALEZ THIAGO SEBASTIAN,20472930363,1154194307,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Luciana Vocal,Mateo Viera,Mateo Viera,,Marcelo,QR HECHO
MANSILLA SERGIO ROLANDO,20313500773,1127506595,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Joaquin Mariscal,Gaston Sarmiento,Gaston Sarmiento,,Paola Fernandez,QR HECHO
SUAVE FABIAN MAXIMILIANO,20445441717,1131854319,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Benjamín Marco,Facundo Tevez,Facundo Tevez,,Tiziana Ayelen Requeijo,QR HECHO
ALTAMIRANO FACUNDO NAHUEL,20462065397,1150416660,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Martina Ortigoza,Luciano Carugno,Luciano Carugno,,Luciano Carugno,QR HECHO
CEJAS MARIANA BELEN,20439196425,1138612105,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Milagros Krauss,Mateo Viera,Mateo Viera,,Mateo Viera,QR HECHO
CAJAL BRAIAN MISHAEL,20539816021,1123507767,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Luca Avenali,Belen Salaverry,Belen Salaverry,,Marcelo,QR HECHO
GIMENEZ DANIELA ALEJANDRA,27406077271,1122384330,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Sabrina Castro,Joaquin Valdez,Joaquin Valdez,,Aryel Puiggros,QR HECHO
NOVOA LAUTARO NEGUEN,20471322955,1133685387,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Martin Rodriguez,Santiago Goldsztein,Santiago Goldsztein,,Nahia Avellaneda,QR HECHO
PAZOS ELISES JESUS,20450735044,1133864160,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Marisabel Galindo,Santiago Goldsztein,Santiago Goldsztein,,Nahuel Sanchez,QR HECHO
DOMINGUEZ JORGE ALEJANDRO,20472201825,1136077625,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Noelia Lageard,Abigail Vera,Abigail Vera,,Laura Gamboa,QR HECHO
LARREA LEIVA LUDMILA SOLANGE,27456264307,1153266321,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Nicole Saravia,Aryel Puiggros,Aryel Puiggros,,Joaquin Valdez,QR HECHO
FOSSACECA TIAGO,20460275793,1140552529,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Aryel Puiggros,Aryel Puiggros,Aryel Puiggros,,Marcelo,QR HECHO
SILVA AXEL TIZIANO,20472289757,1134385356,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Agustín Maya,Facundo Tevez,Facundo Tevez,,Paola Fernandez,QR HECHO
PUSS ALAN NAHUEL,20419818152,1134258777,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Daniel Henriquez,Gaston Sarmiento,Gaston Sarmiento,,Paola Fernandez,QR HECHO
DE LAVALLE LUIS SANTIAGO,20473080533,1158285319,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Pablo Wade,Nahia Avellaneda,Nahia Avellaneda,,Santiago Goldsztein,QR HECHO
ROMERO GERALDINE MILAGROS,27478293858,1171618381,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Guada Bobadilla,Nahia Avellaneda,Nahia Avellaneda,,Tiziana Ayelen Requeijo,QR HECHO
DOMINGUEZ PERALTA MARTIN JAVIER,20462050292,1136077625,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Noelia Lageard,Abigail Vera,Abigail Vera,,Laura Gamboa,QR HECHO
GUAYMAS AYLEN JULISA,27443270049,1130433457,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Luca Avenali,Belen Salaverry,Belen Salaverry,,Marcelo,QR HECHO
SAVADIA SANTIAGO,20471381528,1132725745,alta,OSUTHGRA (108803),BINIMED,11/5/2025,Martin Rodriguez,Santiago Goldsztein,Santiago Goldsztein,,Marcelo,QR HECHO
FRATTI RODRIGO JUAN GABRIEL,20408711135,1130394451,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Erika Cardozo,Belen Salaverry,Belen Salaverry,,Erika Cardozo,QR HECHO
VALDEZ MAURICIO,20472361474,1131643383,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Sabrina Castro,Joaquin Valdez,Joaquin Valdez,,Aryel Puiggros,QR HECHO
LAMILLA AGOSTINA MORENA,27461946785,1169153557,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Joaquin Mariscal,Gaston Sarmiento,Gaston Sarmiento,,Marcelo,QR HECHO
CRISTALDO LUCAS EZEQUIEL,20456796657,1125810208,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Tiziana Ayelen Requeijo,Facundo Tevez,Facundo Tevez,,Tiziana Ayelen Requeijo,QR HECHO
TABORDA FELIPE URIEL,23458734879,1123998762,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Franco Terenzano Rodriguez,Mateo Viera,Mateo Viera,,Marcelo,QR HECHO
UBELLART NEREA,27452969098,1138431775,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Lujan Silva,Facundo Tevez,Facundo Tevez,,Paola Fernandez,QR HECHO
SILVA DAMARIS SOLEDAD LUCIA,27445473656,1162588841,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Lucas Posta,Nahia Avellaneda,Nahia Avellaneda,,Nahia Avellaneda,QR HECHO
GONZALEZ JORGE DAMIAN,20436658037,1123848034,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Martín Fuentes,Alejandro Mejail,Alejandro Mejail,,Paola Fernandez,QR HECHO
IBAÑEZ RAMIRO GABRIEL,20456797106,1132198197,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Tiziana Ayelen Requeijo,Facundo Tevez,Facundo Tevez,,Mateo Viera,QR HECHO
PEÑALOZA ADRIAN ALEJANDRO,20428362668,1154182199,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Agustín Maya,Facundo Tevez,Facundo Tevez,,Paola Fernandez,QR HECHO
ETEVENAUX MORENO PILAR,27454754781,1127567031,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Marisabel Galindo,Santiago Goldsztein,Santiago Goldsztein,,Laura Gamboa,QR HECHO
MOYANO SANTIAGO DANIEL,20446123034,1161175647,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Nataly Miranda,Mateo Viera,Mateo Viera,,Laura Gamboa,QR HECHO
NAGERA BRAIAN NAHUEL,23418902809,1131008446,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Facundo Tevez,Facundo Tevez,Facundo Tevez,,Nahuel Sanchez,QR HECHO
MORALES LOURDES GERALDINE,27467028362,1123978068,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Joaquin Mariscal,Gaston Sarmiento,Gaston Sarmiento,,Joaquin Valdez,QR HECHO
MAIDANA ALAN ANDRES,20434576254,1138961736,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Kyara Stebner,Santiago Goldsztein,Santiago Goldsztein,,Nahuel Sanchez,QR HECHO
DEL RIO DIEGO RAMIRO,20459395076,1133264917,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Matias Del Mul,Joaquin Valdez,Joaquin Valdez,,Marcelo,QR HECHO
GONZALEZ GABRIEL ALEJANDRO,20460889643,1163653716,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Desiree Martinez,Santiago Goldsztein,Santiago Goldsztein,,Paola Fernandez,QR HECHO
JUAREZ MILAGROS AGUSTINA,27470933602,1132505543,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Agustina Lagos,Belen Salaverry,Belen Salaverry,,Paola Fernandez,QR HECHO
FLAMENCO AXEL NICOLAS,20465624222,1152296143,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Agustín Maya,Facundo Tevez,Facundo Tevez,,Marcelo,QR HECHO
PEREYRA AGUSTIN,20435715193,1121764734,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Nicole Saravia,Aryel Puiggros,Aryel Puiggros,,Marcelo,QR HECHO
YBARRA VALENTINA VICTORIA,27468171924,1144203653,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Morena Ledesma,Santiago Goldsztein,Santiago Goldsztein,,Santiago Goldsztein,QR HECHO
LÓPEZ GRANERO GONZALO,20463597023,1126848772,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Mateo Viera,Mateo Viera,Mateo Viera,,Paola Fernandez,QR HECHO
VELAZQUEZ NAHUEL NICOLAS,20479654671,1141720278,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Pablo Wade,Nahia Avellaneda,Nahia Avellaneda,,Nahuel Sanchez,QR HECHO
CASTRO NAHUEL SEBASTIAN,20457388935,1128870740,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Rocio Rylko,Facundo Tevez,Facundo Tevez,,Paola Fernandez,QR HECHO
PEÑA NAHUEL ALBERTO,20426717604,1125452678,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Nahia Avellaneda,Nahia Avellaneda,Nahia Avellaneda,,Santiago Goldsztein,QR HECHO
CAPAY MAURO TOMAS,20465575191,1122824192,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Daniel Henriquez,Gaston Sarmiento,Gaston Sarmiento,,Marcelo,QR HECHO
ZORZIN BAUTISTA EZEQUIEL,20458710695,1128152332,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Martin Rodriguez,Santiago Goldsztein,Santiago Goldsztein,,Nahuel Sanchez,QR HECHO
LUNA LEANDRO AGUSTIN,23465847069,1162309614,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Sabrina Castro,Joaquin Valdez,Joaquin Valdez,,Marcelo,QR HECHO
ROJAS BRENDA ANAHI,27477476274,1124851261,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Rondolini Santino,Belen Salaverry,Belen Salaverry,,Belen Salaverry,QR HECHO
ARANCIBIA TORRICO DARIEL ALEXANDER,23451476599,1150152871,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Lucas Posta,Nahia Avellaneda,Nahia Avellaneda,,Nahuel Sanchez,QR HECHO
ALEGRE LOURDES SOLANGE,27462747387,1169344446,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Tatiana Luna,Nahia Avellaneda,Nahia Avellaneda,,Nahuel Sanchez,QR HECHO
SZEINBEIN MARCO,20454153252,1124067770,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Franco Terenzano Rodriguez,Mateo Viera,Mateo Viera,,Mateo Viera,QR HECHO
LENCINA WENDY ABIGAIL,27461229110,1150296986,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Benjamín Marco,Facundo Tevez,Facundo Tevez,,Kyara Stebner,QR HECHO
GOMEZ ARISTIQUI MARCOS LEONEL,23469882349,1164232339,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Franco Terenzano Rodriguez,Santiago Goldsztein,Santiago Goldsztein,,Laura Gamboa,QR HECHO
PEREZ ZARZA PILAR,27466000278,1125513710,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Paulina Suarez,Joaquin Valdez,Joaquin Valdez,,Joaquin Valdez,QR HECHO
ROMERO FRANCO IVAN,20436290374,1133652810,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Milagros Krauss,Mateo Viera,Mateo Viera,,Abigail Vera,QR HECHO
CACERES SOFIA MAGALI,27434445464,1156931400,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Paulina Suarez,Joaquin Valdez,Joaquin Valdez,,Marcelo,QR HECHO
RAMIREZ CHÁVEZ EMILIANO EZEQUIEL,20444854961,1159922426,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Abril Centurion,Mateo Viera,Mateo Viera,,Paola Fernandez,QR HECHO
FARIAS NICOLAS EDUARDO,20461103082,1126568362,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Paulina Suarez,Joaquin Valdez,Joaquin Valdez,,Marcelo,QR HECHO
CUTTIANI MATEO VALENTIN,20453033555,1165735443,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Luciana Vocal,Mateo Viera,Mateo Viera,,Paola Fernandez,QR HECHO
FINOCCHIARO GUIDO,20454803893,1131714880,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Lucia Galvan,Abigail Vera,Abigail Vera,,Nahia Avellaneda,QR HECHO
DARRICHON MAURO,20421368709,1127984904,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Nuria Balbuena,Aryel Puiggros,Aryel Puiggros,,Aryel Puiggros,QR HECHO
ARISTEGUI IVAN,20342721134,1138662439,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Gaston Sarmiento,Gaston Sarmiento,Gaston Sarmiento,,Laura Gamboa,QR HECHO
DI STEFANO LUCAS ARIEL,20453961231,1144135664,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Oriana Russo,Abigail Vera,Abigail Vera,,Laura Gamboa,QR HECHO
VERA ALAN EZEQUIEL,20467496892,1171171334,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Ailen Montes,Aryel Puiggros,Aryel Puiggros,,Marcelo,QR HECHO
TOME VALENTIN,20465854805,1164780209,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Facundo Tevez,Facundo Tevez,Facundo Tevez,,Laura Gamboa,QR HECHO
RODRIGUEZ SOFIA AGUSTINA,27481723685,1123791966,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Martín Fuentes,Alejandro Mejail,Alejandro Mejail,,Paola Fernandez,QR HECHO
AGUIRRE GUIDO EMMANUEL,20508504633,1131688484,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Erika Cardozo,Belen Salaverry,Belen Salaverry,,Erika Cardozo,QR HECHO
AUGURUSA LUCIA CELESTE,27460995189,1128765706,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Nehuen Centeno,Alejandro Mejail,Alejandro Mejail,,Laura Gamboa,QR HECHO
GAUNA ALEXIS LEONEL,23430967509,1153465896,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Martín Fuentes,Alejandro Mejail,Alejandro Mejail,,Laura Gamboa,QR HECHO
GIMENEZ RAMIRO ARIEL,20452980070,1144059817,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Matias Del Mul,Joaquin Valdez,Joaquin Valdez,,Aryel Puiggros,QR HECHO
AGUILAR MORINIGO KEVIN MARCELO,20456872345,1126649995,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Tatiana Luna,Nahia Avellaneda,Nahia Avellaneda,,Nahuel Sanchez,QR HECHO
MARTINEZ LOPEZ ARIEL SEBASTIAN,20434007462,1139331795,alta,OSUTHGRA (108803),BINIMED,11/6/2025,Joaquin Mariscal,Gaston Sarmiento,Gaston Sarmiento,,Paola Fernandez,QR HECHO
BARBARO FACUNDO LAUTARO,20453106277,1131781482,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Mailen Yamila Viegas,Mateo Viera,Mateo Viera,,Marcelo,QR HECHO
ACOSTA LEDESMA MARINA,23471847194,1135580147,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Noelia Lageard,Abigail Vera,Abigail Vera,,Laura Gamboa,QR HECHO
AGUIRRE GAITAN NAZARENO LUCIANO,20454815840,1154605906,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Mateo Viera,Mateo Viera,Mateo Viera,,Paola Fernandez,QR HECHO
ALBORNOZ SOFIA CELESTE,27336534912,1164017675,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Morena Ledesma,Santiago Goldsztein,Santiago Goldsztein,,Nahuel Sanchez,QR HECHO
ALVAREZ ESTEBAN DAVID,20447643279,1173678674,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Martín Nuñez,Gaston Sarmiento,Gaston Sarmiento,,Paola Fernandez,QR HECHO
ALVAREZ FRANCO LEANDRO RAMON,20400106941,1122626948,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Mateo Viera,Mateo Viera,Mateo Viera,,Mateo Viera,QR HECHO
BLANCO MAXIMILIANO GABRIEL,20472362802,1127647039,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Nicole Saravia,Aryel Puiggros,Aryel Puiggros,,Joaquin Valdez,QR HECHO
CARDOZO LUCIANA CIELO,27480255211,1125102453,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Candela Cosentino,Mateo Viera,Mateo Viera,,Paola Fernandez,QR HECHO
CASTAÑARES JUAN,20406202993,1164143847,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Benjamín Marco,Facundo Tevez,Facundo Tevez,,Nahuel Sanchez,QR HECHO
CASTILLO MATÍAS JESUS,20449641753,1156002824,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Morena Ledesma,Santiago Goldsztein,Santiago Goldsztein,,Santiago Goldsztein,QR HECHO
CENTURION LARA MARIEL,27482146185,1128185930,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Lucas Posta,Nahia Avellaneda,Nahia Avellaneda,,Nahuel Sanchez,QR HECHO
DOS SANTOS LORENZO,20475744110,1123883090,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Morena Ledesma,Santiago Goldsztein,Santiago Goldsztein,,Laura Gamboa,QR HECHO
GOMEZ TATIANA,27478034674,1157967499,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Benjamín Marco,Facundo Tevez,Facundo Tevez,,Santiago Goldsztein,QR HECHO
GOROSO DIEGO DAMIAN,20302731943,1137935523,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Mateo Viera,Mateo Viera,Mateo Viera,,Marcelo,QR HECHO
GUIDA CAMILO ALEJANDRO,20476532524,1160340358,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Sabrina Castro,Joaquin Valdez,Joaquin Valdez,,Aryel Puiggros,QR HECHO
JUAN ALEXIS FABIAN,20371622269,1165051194,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Marcos Ferrer,Facundo Tevez,Facundo Tevez,,Laura Gamboa,QR HECHO
LINARES PABLO SANTIAGO,20417255258,1167395262,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Rocio Rylko,Facundo Tevez,Facundo Tevez,,Marcelo,QR HECHO
MARTINEZ MEDINA PAOLA MARISOL,27449366382,1169671826,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Lucas Posta,Nahia Avellaneda,Nahia Avellaneda,,Tiziana Ayelen Requeijo,QR HECHO
MOCCAGATTA MICAELA ARACELI,23380274094,1153332999,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Dayana Díaz,Facundo Tevez,Facundo Tevez,,Santiago Goldsztein,QR HECHO
PEREYRA NESTOR ALEXANDRO,20445049825,1126861909,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Marcos Ferrer,Facundo Tevez,Facundo Tevez,,Nahuel Sanchez,QR HECHO
PRAT BAUTISTA,20450722996,1138982837,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Milagros Krauss,Mateo Viera,Mateo Viera,,Marcelo,QR HECHO
REBUSTINI ISAIAS GERÓNIMO,20473417228,1160381915,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Ibarra Milenka,Belen Salaverry,Belen Salaverry,,Paola Fernandez,QR HECHO
RIOS MELANY LOURDES ALEJANDRA,27477506130,1132196349,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Juliana Baez,Belen Salaverry,Belen Salaverry,,Analia Suarez,QR HECHO
ROBLEDO TIAGO JOEL,20449663625,1167165622,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Daniel Henriquez,Gaston Sarmiento,Gaston Sarmiento,,Analia Suarez,QR HECHO
ROCCA LEANDRO URIEL,20457361204,1151400814,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Sabrina Castro,Joaquin Valdez,Joaquin Valdez,,Joaquin Valdez,QR HECHO
RODRIGUEZ BRENDA EVELYN,27455236342,1167224904,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Martín Nuñez,Gaston Sarmiento,Gaston Sarmiento,,Laura Gamboa,QR HECHO
ROMERO CELESTE ARIANA,27462848639,1168746819,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Matias Del Mul,Joaquin Valdez,Joaquin Valdez,,Joaquin Valdez,QR HECHO
ROUCHY ROCIO LUJAN,27452025391,1124592056,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Agustin Escalante,Mateo Viera,Mateo Viera,,Paola Fernandez,QR HECHO
SANTOS ALEJO EMMANUEL,20442142565,1164313066,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Daira Cabrera,Nahia Avellaneda,Nahia Avellaneda,,Nahia Avellaneda,QR HECHO
SILVERO DELFINA DANIELA,23457491654,1134558151,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Tatiana Luna,Nahia Avellaneda,Nahia Avellaneda,,Santiago Goldsztein,QR HECHO
VELARDO IARA CAMILA,27466982178,1161606111,alta,OSUTHGRA (108803),BINIMED,11/7/2025,Guada Bobadilla,Nahia Avellaneda,Nahia Avellaneda,,Nahuel Sanchez,QR HECHO`;

async function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row = {};
        headers.forEach((header, index) => {
            row[header.trim()] = values[index]?.trim() || '';
        });
        data.push(row);
    }

    return data;
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

        // Parsear CSV
        console.log('\n📄 Parseando CSV...');
        const rows = await parseCSV(csvData);
        console.log(`✅ ${rows.length} filas parseadas`);

        let updated = 0;
        let notFound = 0;
        let errors = 0;

        for (const row of rows) {
            try {
                const cuil = row['CUIL'];
                const auditorName = row['Auditor'];
                const estado = row['Estado'];

                if (!cuil) {
                    console.warn(`⚠️  Fila sin CUIL, saltando...`);
                    continue;
                }

                // Buscar auditoría por CUIL
                const audit = await Audit.findOne({ cuil });

                if (!audit) {
                    console.warn(`⚠️  No se encontró auditoría con CUIL: ${cuil} (${row['Nombre de afiliado']})`);
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
                        console.warn(`⚠️  Auditor "${auditorName}" no encontrado para ${row['Nombre de afiliado']}`);
                    } else {
                        auditorId = auditor._id;
                    }
                }

                // Actualizar auditoría
                audit.auditor = auditorId;
                audit.status = estado || '';

                await audit.save();

                console.log(`✅ Actualizado: ${row['Nombre de afiliado']} (CUIL: ${cuil}) - Auditor: ${auditorName || 'N/A'}, Estado: ${estado}`);
                updated++;

            } catch (err) {
                console.error(`❌ Error procesando fila ${row['Nombre de afiliado']}:`, err.message);
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
