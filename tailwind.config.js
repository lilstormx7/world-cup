export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#111827', // slate-900
          light: '#f8fafc', // slate-50
          accent: '#10b981', // emerald-500
          accentHover: '#059669', // emerald-600
        }
      }
    },
  },
  plugins: [],
}
