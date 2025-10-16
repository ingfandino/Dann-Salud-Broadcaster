// tailwind.config.js

module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#3B82F6",   // azul vibrante
          green: "#10B981",  // verde esmeralda
          purple: "#8B5CF6", // violeta
          pink: "#EC4899",   // rosa
          orange: "#F97316", // naranja vivo
          yellow: "#FACC15", // amarillo
        },
      },
      backgroundImage: {
        "gradient-1": "linear-gradient(to right, #3B82F6, #8B5CF6)", // azul → violeta
        "gradient-2": "linear-gradient(to right, #10B981, #3B82F6)", // verde → azul
        "gradient-3": "linear-gradient(to right, #EC4899, #F97316)", // rosa → naranja
        "gradient-4": "linear-gradient(to right, #FACC15, #F97316)", // amarillo → naranja
      },
    },
  },
  plugins: [],
};