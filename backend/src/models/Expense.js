const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  fecha: {
    type: Date,
    required: true,
    index: true
  },
  categoria: {
    type: String,
    required: true,
    enum: [
      'Salarios',
      'Servicios',
      'Marketing',
      'Tecnología',
      'Oficina',
      'Transporte',
      'Capacitación',
      'Legal',
      'Impuestos',
      'Otros'
    ]
  },
  descripcion: {
    type: String,
    required: true,
    trim: true
  },
  monto: {
    type: Number,
    required: true,
    min: 0
  },
  metodoPago: {
    type: String,
    required: true,
    enum: ['Efectivo', 'Transferencia', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Cheque']
  },
  responsable: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notas: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

expenseSchema.index({ fecha: -1 });
expenseSchema.index({ categoria: 1 });
expenseSchema.index({ responsable: 1 });
expenseSchema.index({ createdBy: 1 });
expenseSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
