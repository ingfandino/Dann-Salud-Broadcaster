const fs = require('fs');
let code = fs.readFileSync('frontend-nextjs/components/dashboard/auditorias-reventa.tsx', 'utf8');

// The file was reset. Now apply the patch correctly without syntax errors.

// Add imports
code = code.replace(
    /import \{ Download, X, ChevronDown, RefreshCw \} from "lucide-react"/,
    'import { Download, X, ChevronDown, RefreshCw, Pencil } from "lucide-react"'
);
code = code.replace(
    /import \* as XLSX from "xlsx"/,
    'import * as XLSX from "xlsx"\nimport { AuditEditModal } from "./audit-edit-modal"\nimport { createPortal } from "react-dom"'
);

// Add states
code = code.replace(
    /const \[loading, setLoading\] = useState\(false\)/,
    'const [loading, setLoading] = useState(false)\n  const [editModalOpen, setEditModalOpen] = useState(false)\n  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null)'
);

// Add permissions and open modal function
code = code.replace(
    /const isEncargado = userRole === "encargado"/,
    'const isEncargado = userRole === "encargado"\n  const isRecuperador = userRole === "recuperador"\n  const canEdit = isGerencia || isEncargado || isRecuperador'
);

code = code.replace(
    /const handleExport = \(\) => \{/,
    'const openEditModal = (audit: Audit) => {\n    if (!canEdit) {\n      toast.error("No tienes permisos para editar auditorías")\n      return\n    }\n    setSelectedAudit(audit)\n    setEditModalOpen(true)\n  }\n\n  const handleExport = () => {'
);

// Update table header
code = code.replace(
    /<th className="px-2 py-2 w-\[140px\] text-center">Última revisión<\/th>/,
    '<th className="px-2 py-2 w-[140px] text-center">Última revisión</th>\n                <th className="px-2 py-2 w-[80px] text-center">Acciones</th>'
);

// Update colSpan
code = code.replace(/colSpan=\{9\}/g, 'colSpan={10}');

// Update row actions
code = code.replace(
    /<\/span>\n                                                 \)}\n                    <\/td>\n                  <\/tr>/,
    '</span>\n                      ) : (\n                        <span className="opacity-40">Sin revisión</span>\n                      )}\n                    </td>\n                    <td className="px-2 py-1.5 text-center">\n                      {canEdit && (\n                        <button\n                          onClick={() => openEditModal(item)}\n                          className="p-1 hover:bg-blue-100 text-blue-600 rounded dark:hover:bg-blue-900/30 dark:text-blue-400"\n                          title="Editar"\n                        >\n                          <Pencil className="w-3 h-3" />\n                        </button>\n                      )}\n                    </td>\n                  </tr>'
);


// Add the modal at the end, just before the last parenthesis
code = code.replace(
    /    <\/div>\n  \)\n\}/,
    `    </div>\n\n    {/* Modal de edición */}\n    {selectedAudit && editModalOpen && typeof window !== "undefined" && createPortal(\n      <AuditEditModal\n        isOpen={editModalOpen}\n        onClose={() => {\n          setEditModalOpen(false)\n          setSelectedAudit(null)\n        }}\n        audit={selectedAudit}\n        onSave={(updated) => {\n          setAudits(prev => prev.map(a => a._id === updated._id ? updated : a))\n          setEditModalOpen(false)\n          setSelectedAudit(null)\n        }}\n      />,\n      document.body\n    )}\n  </>\n  )\n}`
);

// Add empty fragment to the start of return
code = code.replace(/return \(\n    <div className="flex flex-col gap-4">/, 'return (\n    <>\n      <div className="flex flex-col gap-4">');

fs.writeFileSync('frontend-nextjs/components/dashboard/auditorias-reventa.tsx', code);
