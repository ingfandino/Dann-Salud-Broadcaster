const fs = require('fs');

let code = fs.readFileSync('frontend-nextjs/components/dashboard/audit-edit-modal.tsx', 'utf8');

// The inputs disabled attribute
code = code.replace(
    /name="asesor"\n\s*value=\{form\.asesor\}\n\s*onChange=\{handleChange\}\n\s*disabled=\{false\}/,
    'name="asesor"\n                                            value={form.asesor}\n                                            onChange={handleChange}\n                                            disabled={!isGerencia && !isEncargado && !isRecuperador}'
);

code = code.replace(
    /className=\{cn\(\n\s*"w-full px-3 py-2 rounded-lg border text-sm",\n\s*false,/g,
    'className={cn(\n                                                "w-full px-3 py-2 rounded-lg border text-sm",\n                                                (!isGerencia && !isEncargado && !isRecuperador) && "opacity-60 cursor-not-allowed",'
);

code = code.replace(
    /name="supervisor"\n\s*value=\{form\.supervisor\}\n\s*onChange=\{handleChange\}\n\s*disabled=\{false\}/,
    'name="supervisor"\n                                            value={form.supervisor}\n                                            onChange={handleChange}\n                                            disabled={!isGerencia && !isEncargado && !isRecuperador}'
);

// Admin
code = code.replace(
    /disabled=\{\!isGerencia \&\& \!isAdmin \&\& \!isRecuperador\}/g,
    'disabled={!isGerencia && !isAdmin}'
);
code = code.replace(
    /\(\!isGerencia \&\& \!isAdmin \&\& \!isRecuperador\) \&\& "opacity-60 cursor-not-allowed"/g,
    '(!isGerencia && !isAdmin) && "opacity-60 cursor-not-allowed"'
);

// Referido
if (!code.includes('{(isGerencia || isRecuperador) && (')) {
    code = code.replace(
        /\{isGerencia \&\& \(\s*<div className="flex items-center gap-2">\s*<input\s*type="checkbox"\s*name="isReferido"/g,
        '{(isGerencia || isRecuperador) && (\n                                <div className="flex items-center gap-2">\n                                    <input\n                                        type="checkbox"\n                                        name="isReferido"'
    );
}

fs.writeFileSync('frontend-nextjs/components/dashboard/audit-edit-modal.tsx', code);
