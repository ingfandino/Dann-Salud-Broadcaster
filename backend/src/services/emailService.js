// backend/src/services/emailService.js

const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

function hasSmtpConfig() {
  return (
    !!process.env.SMTP_HOST &&
    !!process.env.SMTP_PORT &&
    !!process.env.SMTP_USER &&
    !!process.env.SMTP_PASS &&
    !!process.env.SMTP_FROM
  );
}

let transporter = null;
function getTransporter() {
  if (!hasSmtpConfig()) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

async function sendPasswordResetEmail(toEmail, resetUrl) {
  const tx = getTransporter();
  if (!tx) {
    logger.warn("SMTP no configurado; no se envía email de recuperación");
    return { sent: false };
  }
  const from = process.env.SMTP_FROM;
  const appName = process.env.APP_NAME || "Dann+Salud Online";
  const subject = `${appName} - Recuperación de contraseña`;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;line-height:1.6">
      <h2>${appName}</h2>
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p>
        Haz clic en el siguiente botón para continuar:
      </p>
      <p>
        <a href="${resetUrl}" style="background:#4f46e5;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Restablecer contraseña</a>
      </p>
      <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
    </div>
  `;
  try {
    await tx.sendMail({ from, to: toEmail, subject, html });
    return { sent: true };
  } catch (err) {
    logger.error("Error enviando email de recuperación", { msg: err?.message });
    return { sent: false, error: err };
  }
}

module.exports = { hasSmtpConfig, sendPasswordResetEmail };
