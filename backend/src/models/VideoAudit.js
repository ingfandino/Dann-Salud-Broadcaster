const mongoose = require('mongoose');

const videoAuditSchema = new mongoose.Schema({
    ventaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Audit',
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['empty', 'video_uploaded', 'audio_uploaded', 'complete'],
        default: 'empty'
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    video: {
        path: String,
        originalName: String,
        mimeType: String,
        size: Number,
        uploadedAt: Date,
        fallbackWebmPath: String
    },
    audioBackup: {
        path: String,
        originalName: String,
        mimeType: String,
        size: Number,
        uploadedAt: Date
    },
    replacementHistory: [{
        reason: String,
        replacedAt: { type: Date, default: Date.now },
        replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        fileType: String,
        oldPath: String
    }],
    room: {
        roomId: { type: String, default: null },
        publicToken: { type: String, default: null, unique: true, sparse: true },
        shortCode: { type: String, default: null, unique: true, sparse: true },
        publicUrl: { type: String, default: null },
        status: {
            type: String,
            enum: ['not_created', 'created', 'invitation_sent', 'affiliate_joined', 'expired', 'cancelled'],
            default: 'not_created'
        },
        createdAt: { type: Date, default: null },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        lastInvitationSentAt: { type: Date, default: null },
        lastInvitationSentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        affiliateJoinedAt: { type: Date, default: null },
        expiresAt: { type: Date, default: null }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('VideoAudit', videoAuditSchema);
