/**
 * ============================================================
 * LOCALITY → ZONE MAPPING
 * ============================================================
 * Business-logic segmentation for the Buenos Aires metro area.
 * All locality names are stored normalized (lowercase, no accents)
 * so comparisons are accent- and case-insensitive.
 *
 * PROVINCIA = anything NOT in CABA, NORTE, SUR, or OESTE.
 * Handled dynamically as a $nin query (see getLocalitiesByZone).
 */

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

const ZONES = {
  CABA: [
    "caba",
    "capital federal",
    "ciudad autonoma de buenos aires",
    "ciudad de buenos aires",
    "buenos aires capital",
    "palermo",
    "belgrano",
    "flores",
    "caballito",
    "san telmo",
    "la boca",
    "recoleta",
    "barracas",
    "villa del parque",
    "villa urquiza",
    "colegiales",
    "saavedra",
    "nunez",
    "villa devoto",
    "liniers",
    "mataderos",
    "parque avellaneda",
    "montserrat",
    "balvanera",
    "almagro",
    "boedo",
    "parque patricios",
    "nueva pompeya",
    "villa lugano",
    "villa riachuelo",
    "constitucion",
    "san nicolas",
    "retiro",
    "puerto madero",
    "microcentro"
  ],

  NORTE: [
    "vicente lopez",
    "florida",
    "florida oeste",
    "munro",
    "villa adelina",
    "olivos",
    "la lucila",
    "martinez",
    "acassuso",
    "san isidro",
    "beccar",
    "boulogne",
    "villa martelli",
    "carapachay",
    "san fernando",
    "victoria",
    "tigre",
    "rincon de milberg",
    "general pacheco",
    "don torcuato",
    "benavidez",
    "ingeniero maschwitz",
    "escobar",
    "garin",
    "pilar",
    "villa rosa",
    "del viso",
    "fátima",
    "fatima",
    "maquinista savio",
    "malvinas argentinas",
    "grand bourg",
    "los polvorines",
    "bella vista",
    "jose c paz",
    "jose c. paz",
    "san miguel",
    "muñiz",
    "muniz",
    "campo de mayo",
    "villa de mayo"
  ],

  SUR: [
    "avellaneda",
    "dock sud",
    "sarandi",
    "gerli",
    "piñeiro",
    "pineiro",
    "crucecita",
    "wilde",
    "lanus",
    "lanus este",
    "lanus oeste",
    "remedios de escalada",
    "valentin alsina",
    "villa caraza",
    "lomas de zamora",
    "banfield",
    "temperley",
    "turdera",
    "myriam stanley",
    "almirante brown",
    "adrogue",
    "burzaco",
    "claypole",
    "longchamps",
    "malvinas argentinas (alte brown)",
    "rafael calzada",
    "calzada",
    "esteban echeverria",
    "monte grande",
    "la union",
    "canning",
    "9 de abril",
    "ezeiza",
    "tristán suares",
    "tristan suares",
    "la paz",
    "quilmes",
    "quilmes centro",
    "quilmes oeste",
    "bernal",
    "bernal oeste",
    "don bosco",
    "ezpeleta",
    "san francisco solano",
    "berazategui",
    "hudson",
    "ranelagh",
    "sourigues",
    "florencio varela",
    "villa brown",
    "villa santa rosa",
    "bosques",
    "ing. juan allan",
    "presidente peron",
    "guernica",
    "san vicente",
    "alejandro korn",
    "canuelas",
    "general rodriguez"
  ],

  OESTE: [
    "la matanza",
    "san justo",
    "ramos mejia",
    "villa luzuriaga",
    "tapiales",
    "gonzalez catan",
    "virrey del pino",
    "isidro casanova",
    "rafael castillo",
    "libertad",
    "ciudad evita",
    "villa celina",
    "laferrere",
    "gregorio de laferrere",
    "haedo",
    "moron",
    "castelar",
    "villa maipú",
    "villa maipu",
    "el palomar",
    "hurlingham",
    "villa tesei",
    "ituzaingo",
    "padua",
    "merlo",
    "parque san martin",
    "pontevedra",
    "paso del rey",
    "trujui",
    "mariano acosta",
    "moreno",
    "cuartel v",
    "cuartel 5",
    "francisco alvarez",
    "la reja",
    "marcos paz",
    "general rodriguez"
  ]
};

/** Pre-computed set of all known localities (normalized) for PROVINCIA exclusion. */
const ALL_KNOWN_LOCALITIES = new Set(
  Object.values(ZONES).flat().map(normalize)
);

/**
 * Resolves a raw locality string to its zone name.
 * Returns "PROVINCIA" if not found in any zone.
 */
function resolveZone(localidadRaw) {
  const loc = normalize(localidadRaw);
  if (!loc) return "PROVINCIA";
  for (const [zone, localities] of Object.entries(ZONES)) {
    if (localities.map(normalize).includes(loc)) return zone;
  }
  return "PROVINCIA";
}

/**
 * Returns an array of locality strings for a given zone name.
 * For PROVINCIA, returns null — the caller must build a $nin query
 * using ALL_KNOWN_LOCALITIES.
 * @param {string} zone - One of: CABA, NORTE, SUR, OESTE, PROVINCIA (case-insensitive)
 * @returns {string[]|null}
 */
function getLocalitiesByZone(zone) {
  if (!zone) return [];
  const upper = zone.toUpperCase();
  if (upper === "PROVINCIA") return null;
  return ZONES[upper] || [];
}

module.exports = {
  ZONES,
  ALL_KNOWN_LOCALITIES,
  normalize,
  resolveZone,
  getLocalitiesByZone,
};
