// src/utils/spintax.js

// Función recursiva para procesar {a|b|c}
function parseSpintax(text) {
    const regex = /\{([^{}]+)\}/;

    while (regex.test(text)) {
        text = text.replace(regex, (match, group) => {
            const options = group.split("|");
            const choice = options[Math.floor(Math.random() * options.length)];
            return choice;
        });
    }

    return text;
}

module.exports = { parseSpintax };