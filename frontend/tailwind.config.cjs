// tailwind.config.js

module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 🎨 NUEVA PALETA CORPORATIVA
        brand: {
          blue: "#009FC2",      // Azul brillante (principal)
          ocean: "#0078A0",     // Azul océano (secundario)
          purple: "#C76CF5",    // Violeta claro
          pink: "#E13BEA",      // Fucsia suave
          dark: "#081E33",      // Fondo oscuro
        },
        // Sobrescribir colores de Tailwind con la nueva paleta
        blue: {
          50: "#E6F7FB",
          100: "#CCEFF7",
          200: "#99DFEF",
          300: "#66CFE7",
          400: "#33BFDF",
          500: "#009FC2",     // Azul brillante (principal)
          600: "#0078A0",     // Azul océano
          700: "#00608B",
          800: "#004876",
          900: "#003061",
          950: "#00244C",
        },
        purple: {
          50: "#F9F0FE",
          100: "#F3E1FD",
          200: "#E7C3FB",
          300: "#DBA5F9",
          400: "#CF87F7",
          500: "#C76CF5",     // Violeta claro (principal)
          600: "#B556E3",
          700: "#A340D1",
          800: "#8C2AAF",
          900: "#75148D",
          950: "#5E0071",
        },
        pink: {
          50: "#FDF0F8",
          100: "#FBE1F1",
          200: "#F7C3E3",
          300: "#F3A5D5",
          400: "#EF87C7",
          500: "#E13BEA",     // Fucsia suave (principal)
          600: "#D325D7",
          700: "#C50FC4",
          800: "#A70FA6",
          900: "#890F88",
          950: "#6B0F6A",
        },
        // Tonos de gris actualizados con base en el fondo oscuro
        gray: {
          50: "#F8FAFB",
          100: "#E8EDEF",
          200: "#D1DBE0",
          300: "#B0BFC7",
          400: "#8FA3AE",
          500: "#6E8795",
          600: "#556A77",
          700: "#3C4D59",
          800: "#23303B",
          900: "#081E33",     // Fondo oscuro
          950: "#051623",
        },
      },
      backgroundImage: {
        "gradient-1": "linear-gradient(to right, #009FC2, #C76CF5)", // azul brillante → violeta
        "gradient-2": "linear-gradient(to right, #0078A0, #009FC2)", // azul océano → azul brillante
        "gradient-3": "linear-gradient(to right, #E13BEA, #C76CF5)", // fucsia → violeta
        "gradient-4": "linear-gradient(to right, #009FC2, #E13BEA)", // azul brillante → fucsia
        "gradient-dark": "linear-gradient(135deg, #081E33 0%, #0078A0 100%)", // fondo oscuro → azul océano
      },
      backgroundColor: {
        "primary": "#009FC2",     // Azul brillante
        "secondary": "#0078A0",   // Azul océano
        "accent": "#E13BEA",      // Fucsia suave
        "dark": "#081E33",        // Fondo oscuro
      },
      textColor: {
        "primary": "#009FC2",     // Azul brillante
        "secondary": "#0078A0",   // Azul océano
        "accent": "#E13BEA",      // Fucsia suave
      },
      borderColor: {
        "primary": "#009FC2",     // Azul brillante
        "secondary": "#0078A0",   // Azul océano
        "accent": "#E13BEA",      // Fucsia suave
      },
    },
  },
  plugins: [],
};