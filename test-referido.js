const fs = require('fs');

let code = fs.readFileSync('frontend-nextjs/components/dashboard/audit-edit-modal.tsx', 'utf8');
if (code.includes('{(isGerencia || isRecuperador) && (')) {
    console.log("isReferido flag logic successfully updated for Recuperador");
} else {
    console.log("MISSING isReferido flag logic");
}
