const fs = require('fs');
let code = fs.readFileSync('frontend-nextjs/components/dashboard/audit-edit-modal.tsx', 'utf8');

// For Asesor
code = code.replace(
    /disabled=\{false\} \/\/ Recuperador no puede modificar, Gerencia y Encargado sí pueden/g,
    'disabled={!isGerencia && !isEncargado && !isRecuperador}'
);
code = code.replace(
    /className=\{cn\(\n\s*"w-full px-3 py-2 rounded-lg border text-sm",\n\s*false, \/\/ Gerencia y Encargado sí pueden editar/g,
    'className={cn(\n                   "w-full px-3 py-2 rounded-lg border text-sm",\n                   (!isGerencia && !isEncargado && !isRecuperador) && "opacity-60 cursor-not-allowed",'
);

// For Grupo
code = code.replace(
    /disabled=\{selectedSupervisorIsGerencia\}/g,
    'disabled={(!isGerencia && !isEncargado && !isRecuperador) || selectedSupervisorIsGerencia}'
);
code = code.replace(
    /\(selectedSupervisorIsGerencia\) \&\& "opacity-60 cursor-not-allowed"/g,
    '((!isGerencia && !isEncargado && !isRecuperador) || selectedSupervisorIsGerencia) && "opacity-60 cursor-not-allowed"'
);

// For Supervisor
code = code.replace(
    /disabled=\{false\} \/\/ Recuperador no puede modificar \(se asigna auto al pasar a Completa\), Gerencia y Encargado sí pueden/g,
    'disabled={!isGerencia && !isEncargado && !isRecuperador}'
);


fs.writeFileSync('frontend-nextjs/components/dashboard/audit-edit-modal.tsx', code);
