const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true, // Ej: "Mañana", "Tarde", "Noche"
        trim: true
    },
    startHour: {
        type: Number,
        required: true,
        min: 0,
        max: 23
    },
    endHour: {
        type: Number,
        required: true,
        min: 0,
        max: 23
    },
    supervisor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Shift', shiftSchema);
