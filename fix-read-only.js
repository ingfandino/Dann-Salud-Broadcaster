const fs = require('fs');

let code = fs.readFileSync('frontend-nextjs/components/dashboard/audit-edit-modal.tsx', 'utf8');

// For isReadOnly, we want to make sure it respects isReadOnlyMode but maybe it also needs to consider some roles.
// But the user said: "el Recuperador no puede editar registros desde Seguimiento, solo desde: 'Falta clave', 'Pendiente', 'Rechazada', 'AFIP y Padron' y 'Disponible para reventa'".
// This is already done by passing isReadOnlyMode={isRecuperador || isAdministrativo} from Seguimiento.

fs.writeFileSync('frontend-nextjs/components/dashboard/audit-edit-modal.tsx', code);
