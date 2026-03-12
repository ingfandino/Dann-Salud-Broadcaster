const fs = require('fs');
let code = fs.readFileSync('frontend-nextjs/components/dashboard/audit-edit-modal.tsx', 'utf8');

// For Asesor, Supervisor, Grupo
code = code.replace(
    /disabled=\{\!isGerencia \&\& \!isEncargado \&\& \!isRecuperador\}/g,
    'disabled={!isGerencia && !isEncargado && !isRecuperador}'
);
code = code.replace(
    /disabled=\{\(\!isGerencia \&\& \!isEncargado \&\& \!isRecuperador\) \|\| selectedSupervisorIsGerencia\}/g,
    'disabled={(!isGerencia && !isEncargado && !isRecuperador) || selectedSupervisorIsGerencia}'
);

// We need to also fix the "opacity-60 cursor-not-allowed" classes logic so they do not apply to Recuperador.
code = code.replace(
    /\(\!isGerencia \&\& \!isEncargado \&\& \!isRecuperador\) \&\& "opacity-60 cursor-not-allowed"/g,
    '(!isGerencia && !isEncargado && !isRecuperador) && "opacity-60 cursor-not-allowed"'
);
code = code.replace(
    /\(\(\!isGerencia \&\& \!isEncargado \&\& \!isRecuperador\) \|\| selectedSupervisorIsGerencia\) \&\& "opacity-60 cursor-not-allowed"/g,
    '((!isGerencia && !isEncargado && !isRecuperador) || selectedSupervisorIsGerencia) && "opacity-60 cursor-not-allowed"'
);

// Also we need to fix the auditor / administrador
code = code.replace(
    /disabled=\{\!isGerencia \&\& \!isAdmin \&\& \!isRecuperador\}/g,
    'disabled={!isGerencia && !isAdmin && !isRecuperador}'
);
code = code.replace(
    /\(\!isGerencia \&\& \!isAdmin \&\& \!isRecuperador\) \&\& "opacity-60 cursor-not-allowed"/g,
    '(!isGerencia && !isAdmin && !isRecuperador) && "opacity-60 cursor-not-allowed"'
);

fs.writeFileSync('frontend-nextjs/components/dashboard/audit-edit-modal.tsx', code);
