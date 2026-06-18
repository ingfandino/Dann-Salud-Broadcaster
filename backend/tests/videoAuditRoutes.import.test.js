"use strict";

const fs = require("fs");
const Module = require("module");
const path = require("path");

const sourceFiles = [
    "../src/routes/videoAuditRoutes.js",
    "../src/controllers/videoAuditController.js",
    "../src/services/whatsappSendAttemptService.js",
];

function findRelativeRequires(filePath) {
    const source = fs.readFileSync(filePath, "utf8");
    const requires = [];
    const requirePattern = /require\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g;
    let match;

    while ((match = requirePattern.exec(source)) !== null) {
        requires.push(match[1]);
    }

    return requires;
}

describe("VideoAudit route dependency paths", () => {
    it("resolves production route dependencies without mocks", () => {
        for (const relativeSource of sourceFiles) {
            const sourcePath = path.join(__dirname, relativeSource);
            const requireFromSource = Module.createRequire(sourcePath);

            for (const requiredPath of findRelativeRequires(sourcePath)) {
                expect(() => requireFromSource.resolve(requiredPath)).not.toThrow();
            }
        }
    });
});
