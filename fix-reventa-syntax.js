const fs = require('fs');

let code = fs.readFileSync('frontend-nextjs/components/dashboard/auditorias-reventa.tsx', 'utf8');

code = code.replace(
`    {/* Modal de edición */}
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
  )
}`,
`      {/* Modal de edición */}
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
}`
);

// We need to add the <> at the beginning of the return if we added </>
code = code.replace(/return \(\n    <div className="flex flex-col gap-4">/, 'return (\n    <>\n      <div className="flex flex-col gap-4">');

fs.writeFileSync('frontend-nextjs/components/dashboard/auditorias-reventa.tsx', code);
