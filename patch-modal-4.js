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


// I will revert logic to standard if needed, or simply make those fields fully editable by anyone who can edit the modal.
// Since the modal is already blocked by canEdit, if the modal opens, they can edit. Wait, the modal might be read-only if isReadOnly=true.
// For recuperador, it's false now.

fs.writeFileSync('frontend-nextjs/components/dashboard/audit-edit-modal.tsx', code);
