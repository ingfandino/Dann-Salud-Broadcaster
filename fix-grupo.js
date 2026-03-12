const fs = require('fs');

let code = fs.readFileSync('frontend-nextjs/components/dashboard/audit-edit-modal.tsx', 'utf8');

// For Grupo
code = code.replace(
    /disabled=\{selectedSupervisorIsGerencia\} \/\/ Recuperador no puede modificar, Gerencia y Encargado sí pueden/g,
    'disabled={(!isGerencia && !isEncargado && !isRecuperador) || selectedSupervisorIsGerencia}'
);

code = code.replace(
    /\(selectedSupervisorIsGerencia\) \&\& "opacity-60 cursor-not-allowed", \/\/ Gerencia y Encargado sí pueden editar/g,
    '((!isGerencia && !isEncargado && !isRecuperador) || selectedSupervisorIsGerencia) && "opacity-60 cursor-not-allowed",'
);

fs.writeFileSync('frontend-nextjs/components/dashboard/audit-edit-modal.tsx', code);
