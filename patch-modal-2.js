const fs = require('fs');
let code = fs.readFileSync('frontend-nextjs/components/dashboard/audit-edit-modal.tsx', 'utf8');

// The boolean logic for Recuperador has issues in the previous attempt, we will directly find and replace the props to `disabled={false}` for the ones that need to be fully editable by Recuperador if they are Recuperador.

code = code.replace(
    /disabled=\{\!isGerencia \&\& \!isEncargado \&\& \!isRecuperador\}/g,
    'disabled={!isGerencia && !isEncargado && !isRecuperador}'
);

code = code.replace(
    /disabled\{\(\!isGerencia \&\& \!isEncargado \&\& \!isRecuperador\) \|\| selectedSupervisorIsGerencia\}/g,
    'disabled={(!isGerencia && !isEncargado && !isRecuperador) || selectedSupervisorIsGerencia}'
);

code = code.replace(
    /disabled=\{\!isGerencia \&\& \!isAdmin \&\& \!isRecuperador\}/g,
    'disabled={!isGerencia && !isAdmin && !isRecuperador}'
);

fs.writeFileSync('frontend-nextjs/components/dashboard/audit-edit-modal.tsx', code);
