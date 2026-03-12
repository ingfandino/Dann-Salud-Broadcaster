const fs = require('fs');
let code = fs.readFileSync('frontend-nextjs/components/dashboard/auditorias-seguimiento.tsx', 'utf8');

// Revert eye icon logic
code = code.replace(
    /title=\{isAdministrativo \? "Ver detalles" : "Editar"\}/g,
    'title={(isRecuperador || isAdministrativo) ? "Ver detalles" : "Editar"}'
);

code = code.replace(
    /\{isAdministrativo \? <Eye className="w-3 h-3" \/> : <Pencil className="w-3 h-3" \/>\}/g,
    '{(isRecuperador || isAdministrativo) ? <Eye className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}'
);

// Pass isReadOnlyMode to AuditEditModal
code = code.replace(
    /<AuditEditModal\n          isOpen=\{editModalOpen\}/,
    '<AuditEditModal\n          isOpen={editModalOpen}\n          isReadOnlyMode={isRecuperador || isAdministrativo}'
);

fs.writeFileSync('frontend-nextjs/components/dashboard/auditorias-seguimiento.tsx', code);
