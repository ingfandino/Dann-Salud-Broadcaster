function normalizePhoneDigits(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  digits = digits.replace(/^0+/, '');
  if (digits.startsWith('15')) digits = digits.slice(2);
  if (digits.startsWith('54') && !digits.startsWith('549')) {
    digits = `549${digits.slice(2)}`;
  }
  if (!digits.startsWith('54')) {
    digits = `549${digits}`;
  }
  return digits;
}

function getJidDomainForEngine(engine) {
  return engine === 'baileys' ? 's.whatsapp.net' : 'c.us';
}

function formatWhatsAppJid(phoneOrJid, engine) {
  const domain = getJidDomainForEngine(engine);
  const raw = String(phoneOrJid || '').trim();
  const localPart = raw.includes('@') ? raw.split('@')[0] : raw;
  const digits = normalizePhoneDigits(localPart);

  if (!digits || digits.length < 10) {
    const err = new Error('Telefono invalido para WhatsApp');
    err.code = 'INVALID_WHATSAPP_PHONE';
    throw err;
  }

  return `${digits}@${domain}`;
}

function maskJid(jid) {
  const [phone, domain] = String(jid || '').split('@');
  if (!phone || !domain) return null;
  return `***${phone.slice(-4)}@${domain}`;
}

module.exports = {
  formatWhatsAppJid,
  getJidDomainForEngine,
  maskJid,
  normalizePhoneDigits,
};
