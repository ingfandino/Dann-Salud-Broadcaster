// scripts/createProdUsers.js
// Script para crear usuarios en entorno de producción

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const { v4: uuidv4 } = require('uuid');

// Importar modelo de usuario
const User = require('../backend/src/models/User');
const connectDB = require('../backend/src/config/db');

// Interfaz para leer input del usuario
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Función para preguntar al usuario
function pregunta(texto) {
  return new Promise((resolve) => {
    rl.question(texto, (respuesta) => {
      resolve(respuesta);
    });
  });
}

// Función principal
async function main() {
  try {
    console.log('🔐 Creación de usuarios para entorno de producción');
    console.log('===============================================');
    
    // Conectar a la base de datos
    await connectDB();
    console.log('✅ Conectado a MongoDB');
    
    // Solicitar datos del usuario administrador
    console.log('\n📝 Creación de usuario administrador:');
    const adminNombre = await pregunta('Nombre completo: ');
    const adminEmail = await pregunta('Email: ');
    const adminUsername = await pregunta('Nombre de usuario: ');
    let adminPassword = await pregunta('Contraseña (mínimo 8 caracteres): ');
    
    // Validar contraseña
    while (adminPassword.length < 8) {
      console.log('❌ La contraseña debe tener al menos 8 caracteres');
      adminPassword = await pregunta('Contraseña (mínimo 8 caracteres): ');
    }
    
    // Crear usuario administrador
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);
    
    const adminUser = new User({
      username: adminUsername,
      nombre: adminNombre,
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      active: true
    });
    
    await adminUser.save();
    console.log(`\n✅ Usuario administrador creado: ${adminEmail}`);
    
    // Preguntar si desea crear un usuario auditor
    const crearAuditor = await pregunta('\n¿Desea crear un usuario auditor? (s/n): ');
    
    if (crearAuditor.toLowerCase() === 's') {
      console.log('\n📝 Creación de usuario auditor:');
      const auditorNombre = await pregunta('Nombre completo: ');
      const auditorEmail = await pregunta('Email: ');
      const auditorUsername = await pregunta('Nombre de usuario: ');
      let auditorPassword = await pregunta('Contraseña (mínimo 8 caracteres): ');
      
      // Validar contraseña
      while (auditorPassword.length < 8) {
        console.log('❌ La contraseña debe tener al menos 8 caracteres');
        auditorPassword = await pregunta('Contraseña (mínimo 8 caracteres): ');
      }
      
      // Crear usuario auditor
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(auditorPassword, salt);
      
      const auditorUser = new User({
        username: auditorUsername,
        nombre: auditorNombre,
        email: auditorEmail,
        password: hashedPassword,
        role: 'auditor',
        active: true
      });
      
      await auditorUser.save();
      console.log(`\n✅ Usuario auditor creado: ${auditorEmail}`);
    }
    
    console.log('\n🎉 Proceso completado. Ya puede iniciar el servidor en modo producción.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Ejecutar función principal
main();