const fs = require('fs');

let code = fs.readFileSync('frontend-nextjs/components/dashboard/auditorias-reventa.tsx', 'utf8');

// 1. Import AuditEditModal, Pencil icon
code = code.replace(
    /import { Download, X, ChevronDown, RefreshCw } from "lucide-react"/,
    'import { Download, X, ChevronDown, RefreshCw, Pencil } from "lucide-react"'
);
code = code.replace(
    /import { useAuth } from "@\/lib\/auth"\nimport \* as XLSX from "xlsx"/,
    'import { useAuth } from "@/lib/auth"\nimport * as XLSX from "xlsx"\nimport { AuditEditModal } from "./audit-edit-modal"\nimport { createPortal } from "react-dom"'
);

// 2. Add state for modal
if (!code.includes('editModalOpen')) {
    code = code.replace(
        /const \[loading, setLoading\] = useState\(false\)/,
        'const [loading, setLoading] = useState(false)\n  const [editModalOpen, setEditModalOpen] = useState(false)\n  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null)'
    );
}

// 3. Define user roles inside the component
if (!code.includes('const isRecuperador =')) {
    code = code.replace(
        /const isEncargado = userRole === "encargado"/,
        'const isEncargado = userRole === "encargado"\n  const isRecuperador = userRole === "recuperador"\n  const canEdit = isGerencia || isEncargado || isRecuperador'
    );
}

// 4. Add openEditModal function
if (!code.includes('const openEditModal')) {
    code = code.replace(
        /const handleExport = \(\) => \{/,
        'const openEditModal = (audit: Audit) => {\n    if (!canEdit) {\n      toast.error("No tienes permisos para editar auditorías")\n      return\n    }\n    setSelectedAudit(audit)\n    setEditModalOpen(true)\n  }\n\n  const handleExport = () => {'
    );
}

// 5. Add header for Acciones
if (!code.includes('<th className="px-2 py-2 w-[80px] text-center">Acciones</th>')) {
    code = code.replace(
        /<th className="px-2 py-2 w-\[140px\] text-center">Última revisión<\/th>/,
        '<th className="px-2 py-2 w-[140px] text-center">Última revisión</th>\n                <th className="px-2 py-2 w-[80px] text-center">Acciones</th>'
    );
}

// 6. Add cell for Acciones in tbody
if (!code.includes('<td className="px-2 py-1.5 text-center">')) {
    // We need to inject the <td> after the last </td> inside the map
    code = code.replace(
        /<\/td>\n                  <\/tr>/g,
        '</td>\n                    <td className="px-2 py-1.5 text-center">\n                      {canEdit && (\n                        <button\n                          onClick={() => openEditModal(item)}\n                          className="p-1 hover:bg-blue-100 text-blue-600 rounded dark:hover:bg-blue-900/30 dark:text-blue-400"\n                          title="Editar"\n                        >\n                          <Pencil className="w-3 h-3" />\n                        </button>\n                      )}\n                    </td>\n                  </tr>'
    );
}

// 7. Render AuditEditModal at the end of the component
if (!code.includes('<AuditEditModal')) {
    code = code.replace(
        /<\/div>\n    <\/div>\n  \)\n\}/,
        `</div>\n    </div>\n\n    {/* Modal de edición */}\n    {selectedAudit && editModalOpen && typeof window !== "undefined" && createPortal(\n      <AuditEditModal\n        isOpen={editModalOpen}\n        onClose={() => {\n          setEditModalOpen(false)\n          setSelectedAudit(null)\n        }}\n        audit={selectedAudit}\n        onSave={(updated) => {\n          setAudits(prev => prev.map(a => a._id === updated._id ? updated : a))\n          setEditModalOpen(false)\n          setSelectedAudit(null)\n        }}\n      />,\n      document.body\n    )}\n  )\n}`
    );
}

// 8. Fix colSpan for loading/empty state
code = code.replace(/colSpan=\{9\}/g, 'colSpan={10}');

fs.writeFileSync('frontend-nextjs/components/dashboard/auditorias-reventa.tsx', code);

