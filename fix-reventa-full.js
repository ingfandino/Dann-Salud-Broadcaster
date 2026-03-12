const fs = require('fs');

let code = fs.readFileSync('frontend-nextjs/components/dashboard/auditorias-reventa.tsx', 'utf8');

// I will manually reconstruct the return part of the component

let startOfReturn = code.indexOf('return (');
if (startOfReturn !== -1) {
    let returnBlock = code.substring(startOfReturn);
    
    // Check if it already has <> wrapper
    if (returnBlock.startsWith('return (\\n    <>')) {
         console.log("Already has <>");
    } else {
         // Replace return ( with return (\\n    <>
         code = code.replace(/return \(\n    <div className="flex flex-col gap-4">/, 'return (\n    <>\n      <div className="flex flex-col gap-4">');
    }
}

fs.writeFileSync('frontend-nextjs/components/dashboard/auditorias-reventa.tsx', code);
