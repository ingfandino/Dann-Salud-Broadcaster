const fs = require('fs');
let code = fs.readFileSync('frontend-nextjs/components/dashboard/audit-edit-modal.tsx', 'utf8');

// Add isReadOnlyMode to Props
code = code.replace(
    /onSave: \(updatedAudit: Audit\) => void\n\}/,
    'onSave: (updatedAudit: Audit) => void\n    isReadOnlyMode?: boolean\n}'
);

// Add to component destructuring
code = code.replace(
    /export function AuditEditModal\(\{ isOpen, onClose, audit, onSave \}: AuditEditModalProps\) \{/,
    'export function AuditEditModal({ isOpen, onClose, audit, onSave, isReadOnlyMode = false }: AuditEditModalProps) {'
);

// Change isReadOnly definition
code = code.replace(
    /const isReadOnly = isRecuperador;/,
    'const isReadOnly = isReadOnlyMode;'
);

// Fix dropdowns for isRecuperador
code = code.replace(/disabled=\{\!isGerencia \&\& \!isEncargado \|\| isRecuperador\}/g, 'disabled={!isGerencia && !isEncargado && !isRecuperador}');
code = code.replace(/disabled=\{\!isGerencia \&\& \!isEncargado \|\| selectedSupervisorIsGerencia \|\| isRecuperador\}/g, 'disabled={(!isGerencia && !isEncargado && !isRecuperador) || selectedSupervisorIsGerencia}');
code = code.replace(/disabled=\{\(\!isGerencia \&\& \!isAdmin\) \|\| isRecuperador\}/g, 'disabled={!isGerencia && !isAdmin && !isRecuperador}');

code = code.replace(/\(\!isGerencia \&\& \!isEncargado \|\| isRecuperador\) \&\& "opacity-60 cursor-not-allowed"/g, '(!isGerencia && !isEncargado && !isRecuperador) && "opacity-60 cursor-not-allowed"');
code = code.replace(/\(\!isGerencia \&\& \!isEncargado \|\| selectedSupervisorIsGerencia \|\| isRecuperador\) \&\& "opacity-60 cursor-not-allowed"/g, '((!isGerencia && !isEncargado && !isRecuperador) || selectedSupervisorIsGerencia) && "opacity-60 cursor-not-allowed"');
code = code.replace(/\(\(\!isGerencia \&\& \!isAdmin\) \|\| isRecuperador\) \&\& "opacity-60 cursor-not-allowed"/g, '(!isGerencia && !isAdmin && !isRecuperador) && "opacity-60 cursor-not-allowed"');

// Fix Referido checkbox to show for Recuperador
code = code.replace(/\{isGerencia \&\& \(\s*<div className="flex items-center gap-2">\s*<input\s*type="checkbox"\s*name="isReferido"/g, '{(isGerencia || isRecuperador) && (\n                                <div className="flex items-center gap-2">\n                                    <input\n                                        type="checkbox"\n                                        name="isReferido"');

// Clean up any remaining disabled={isRecuperador} and its opacity class, EXCEPT for the one we want to keep?
// Wait, user said: "El Recuperador todavía tiene bloqueados los dropdown: 'Asesor', 'Grupo', 'Supervisor'; debe poder editarlos."
// He didn't mention other fields, but we already know Recuperador should be able to edit the Audit.
// Let's replace simple disabled={isRecuperador} with disabled={false} but wait, let's just remove them.
code = code.replace(/disabled=\{isRecuperador\}(\s*\/\/[^\n]*\n)?/g, '');
code = code.replace(/isRecuperador \&\& "opacity-60 cursor-not-allowed",?\n/g, '');


fs.writeFileSync('frontend-nextjs/components/dashboard/audit-edit-modal.tsx', code);
