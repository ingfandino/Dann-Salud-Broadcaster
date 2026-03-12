const fs = require('fs');

let code = fs.readFileSync('frontend-nextjs/components/dashboard/auditorias-reventa.tsx', 'utf8');

// Hay un problema sintáctico en la parte final del archivo, vamos a reemplazar el final por lo correcto
const correctEnd = `      </div>
    </div>

      {/* Modal de edición */}
      {selectedAudit && editModalOpen && typeof window !== "undefined" && createPortal(
        <AuditEditModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setSelectedAudit(null)
          }}
          audit={selectedAudit}
          onSave={(updated) => {
            setAudits(prev => prev.map(a => a._id === updated._id ? updated : a))
            setEditModalOpen(false)
            setSelectedAudit(null)
          }}
        />,
        document.body
      )}
    </>
  )
}`;

// Busquemos el patrón en la última parte
code = code.replace(/      <\/div>\n    <\/div>\n\n      \{\/\* Modal de edición \*\/\}[\s\S]*\}\n\}\n?$/, correctEnd);

fs.writeFileSync('frontend-nextjs/components/dashboard/auditorias-reventa.tsx', code);
