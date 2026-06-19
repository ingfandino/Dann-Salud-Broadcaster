const fs = require("fs/promises");
const path = require("path");

const basePath = process.env.DOCUMENT_PROCESSING_STORAGE_PATH || path.join(process.cwd(), "storage", "document-processing");

function resolveStoragePath(relativePath) {
    const resolved = path.resolve(basePath, relativePath);
    if (!resolved.startsWith(path.resolve(basePath))) {
        throw new Error("Ruta de almacenamiento inválida");
    }
    return resolved;
}

async function saveFile(relativePath, buffer) {
    const targetPath = resolveStoragePath(relativePath);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, buffer);
    return { path: relativePath };
}

async function readFile(relativePath) {
    return fs.readFile(resolveStoragePath(relativePath));
}

async function deleteFile(relativePath) {
    await fs.unlink(resolveStoragePath(relativePath));
}

module.exports = {
    saveFile,
    readFile,
    deleteFile,
    resolveStoragePath,
};
