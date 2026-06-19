const localOcr = require("./localOcr.service");

async function extractDniData(filePath) {
    const text = await localOcr.extractText(filePath);
    return {
        dniNumber: "",
        cuilFromDni: "",
        birthDate: "",
        address: "",
        fieldConfidence: {},
        identityValidation: {},
        originalExtractedValues: { text },
        correctedValues: {},
    };
}

module.exports = {
    extractDniData,
};
