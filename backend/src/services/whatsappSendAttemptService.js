const WhatsAppSendAttempt = require('../models/WhatsAppSendAttempt');
const logger = require('../utils/logger').getLogger('whatsapp');
const { maskJid } = require('../utils/whatsappJid');

async function recordWhatsAppSendAttempt({
    flow,
    userId,
    sourceId,
    engine,
    recipient,
    jid,
    sendStatus,
    messageId,
    errorCode,
    errorMessage,
    metadata
}) {
    try {
        let recipientMasked = undefined;
        let jidDomain = undefined;

        const effectiveJid = jid || (recipient && String(recipient).includes('@') ? String(recipient) : undefined);
        if (effectiveJid) {
            const masked = maskJid(effectiveJid);
            if (masked) {
                const parts = masked.split('@');
                recipientMasked = `********${parts[0].replace('***', '')}`;
                jidDomain = parts[1];
            }
        }

        if (!recipientMasked && recipient) {
            const str = String(recipient);
            recipientMasked = str.length >= 4 ? `********${str.slice(-4)}` : '***';
        }

        let logStr = `[WhatsAppSendAttempt] flow=${flow} status=${sendStatus}`;
        if (engine) logStr += ` engine=${engine}`;
        if (userId) logStr += ` userId=${String(userId)}`;
        if (sourceId) logStr += ` sourceId=${String(sourceId)}`;
        if (recipientMasked) logStr += ` recipient=${recipientMasked}`;
        if (jidDomain) logStr += ` jidDomain=${jidDomain}`;
        if (messageId) logStr += ` messageId=${messageId}`;
        if (errorCode) logStr += ` code=${errorCode}`;

        const cleanError = errorMessage ? String(errorMessage).replace(/[\r\n]+/g, ' ').substring(0, 100) : undefined;
        if (cleanError && (sendStatus === 'failed' || sendStatus === 'unavailable' || sendStatus === 'not_connected')) {
            logStr += ` error="${cleanError}"`;
        }

        if (sendStatus === 'failed' || sendStatus === 'unavailable' || sendStatus === 'not_connected') {
            logger.warn(logStr);
        } else {
            logger.info(logStr);
        }

        const attempt = new WhatsAppSendAttempt({
            flow,
            userId,
            sourceId: sourceId ? String(sourceId) : undefined,
            engine,
            recipientMasked,
            jidDomain,
            sendStatus,
            messageId,
            errorCode,
            errorMessage,
            metadata
        });

        await attempt.save();
    } catch (error) {
        logger.warn(`[WhatsAppSendAttempt] DB Log Error: ${error.message}`);
    }
}

module.exports = {
    recordWhatsAppSendAttempt
};
