const fs = require('fs');

let code = fs.readFileSync('frontend-nextjs/components/dashboard/auditorias-reventa.tsx', 'utf8');

// The file was likely truncated incorrectly and is missing the final closing brace for the `export function AuditoriasReventa() {`
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
}
`;

code = code.replace(/      <\/div>\n    <\/div>\n\n      \{\/\* Modal de edición \*\/\}[\s\S]*$/, correctEnd);

fs.writeFileSync('frontend-nextjs/components/dashboard/auditorias-reventa.tsx', code);
