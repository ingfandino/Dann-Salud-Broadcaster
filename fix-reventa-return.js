const fs = require('fs');

let code = fs.readFileSync('frontend-nextjs/components/dashboard/auditorias-reventa.tsx', 'utf8');

// Hay que asegurar que el JSX devuelto empieza con un <> vacío si vamos a cerrar con </> al final.
// El error original era:
//  617 |       {/* Modal de edición */}
//        |       ^
// Lo que ocurre es que estamos devolviendo multiples elementos a nivel root.

let returnStart = code.indexOf('return (\n    <div className="space-y-6 animate-fade-in-up">');
if (returnStart !== -1) {
    code = code.replace(
        'return (\n    <div className="space-y-6 animate-fade-in-up">', 
        'return (\n    <>\n      <div className="space-y-6 animate-fade-in-up">'
    );
    console.log("Added wrapper <>\n");
} else {
    console.log("Wrapper <> already added or couldn't find return block.");
}

fs.writeFileSync('frontend-nextjs/components/dashboard/auditorias-reventa.tsx', code);
