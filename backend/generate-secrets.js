// generate-secrets.js
const crypto = require("crypto");

// Función que genera un secreto aleatorio en formato hex/base64
function generateSecret(length = 64, encoding = "base64") {
    return crypto.randomBytes(length).toString(encoding);
}

console.log("JWT_SECRET =", generateSecret(48, "base64"));
console.log("SESSION_SECRET =", generateSecret(48, "base64"));