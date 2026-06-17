function normalizeText(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function formatSocialHealthItem(item) {
    return {
        code: item.code,
        codePadded: String(item.code).padStart(6, "0"),
        name: item.name,
    };
}

function matchesSocialHealthSearch(item, rawSearch) {
    const term = normalizeText(rawSearch);
    if (!term) return true;

    const digits = term.replace(/\D/g, "");
    if (digits && digits.length === term.length) {
        const code = String(item.code || "");
        const codePadded = String(item.codePadded || item.code || "").padStart(6, "0");
        return code === digits ||
            code.startsWith(digits) ||
            codePadded === digits ||
            codePadded.startsWith(digits) ||
            codePadded.includes(digits);
    }

    return normalizeText(item.name).includes(term);
}

function filterSocialHealthItems(items, search) {
    return items
        .map(formatSocialHealthItem)
        .filter((item) => matchesSocialHealthSearch(item, search));
}

module.exports = {
    filterSocialHealthItems,
    formatSocialHealthItem,
    matchesSocialHealthSearch,
    normalizeText,
};
