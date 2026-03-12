const fs = require('fs');
let code = fs.readFileSync('frontend-nextjs/components/dashboard/audit-edit-modal.tsx', 'utf8');

// For Asesor, Supervisor, Grupo
code = code.replace(
    /disabled=\{\!isGerencia \&\& \!isEncargado \&\& \!isRecuperador\}/g,
    'disabled={false}'
);

code = code.replace(
    /disabled=\{\(\!isGerencia \&\& \!isEncargado \&\& \!isRecuperador\) \|\| selectedSupervisorIsGerencia\}/g,
    'disabled={selectedSupervisorIsGerencia}'
);

code = code.replace(
    /\(\!isGerencia \&\& \!isEncargado \&\& \!isRecuperador\) \&\& "opacity-60 cursor-not-allowed"/g,
    'false'
);

code = code.replace(
    /\(\(\!isGerencia \&\& \!isEncargado \&\& \!isRecuperador\) \|\| selectedSupervisorIsGerencia\) \&\& "opacity-60 cursor-not-allowed"/g,
    '(selectedSupervisorIsGerencia) && "opacity-60 cursor-not-allowed"'
);

fs.writeFileSync('frontend-nextjs/components/dashboard/audit-edit-modal.tsx', code);
