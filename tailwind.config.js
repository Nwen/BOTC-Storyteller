/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        townsfolk: '#3b82f6',
        outsider:  '#06b6d4',
        minion:    '#f97316',
        demon:     '#ef4444',
        traveler:  '#a855f7',
        fabled:    '#eab308',
      },
    },
  },
  plugins: [],
}
