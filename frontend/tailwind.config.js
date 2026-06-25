/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        // Ombres douces « SaaS » : diffuses, peu contrastées
        card: '0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)',
        'card-hover': '0 12px 30px -8px rgb(16 24 40 / 0.16), 0 4px 10px -4px rgb(16 24 40 / 0.08)',
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    // Thème unique et cohérent de l'application (identité indigo → violet).
    themes: [
      {
        gstock: {
          'primary': '#4f46e5',            // indigo-600 — plus affirmé
          'primary-content': '#ffffff',
          'secondary': '#7c3aed',          // violet-600
          'secondary-content': '#ffffff',
          'accent': '#0ea5e9',             // sky-500
          'accent-content': '#ffffff',
          'neutral': '#0f172a',            // slate-900
          'neutral-content': '#ffffff',
          'base-100': '#ffffff',           // cartes blanches
          'base-200': '#f1f5f9',           // slate-100 → fond d'application subtil
          'base-300': '#e2e8f0',           // slate-200 → bordures de cartes
          'base-content': '#0f172a',       // texte slate-900 net
          'info': '#0ea5e9',
          'success': '#10b981',
          'warning': '#f59e0b',
          'error': '#f43f5e',
          '--rounded-box': '1rem',
          '--rounded-btn': '0.65rem',
          '--rounded-badge': '0.5rem',
          '--animation-btn': '0.2s',
          '--animation-input': '0.2s',
          '--border-btn': '1px',
          '--tab-radius': '0.5rem',
        },
      },
      {
        // Pendant sombre, de marque (mêmes accents indigo/violet, base ardoise slate).
        'gstock-dark': {
          'primary': '#818cf8',            // indigo-400 (plus clair → lisible sur fond sombre)
          'primary-content': '#0b1020',
          'secondary': '#c084fc',          // purple-400
          'secondary-content': '#0b1020',
          'accent': '#38bdf8',             // sky-400
          'accent-content': '#08131f',
          'neutral': '#1e293b',
          'neutral-content': '#e2e8f0',
          'base-100': '#0f172a',           // slate-900 — surface / cartes
          'base-200': '#1e293b',           // slate-800 — remplissages atténués
          'base-300': '#334155',           // slate-700 — bordures visibles
          'base-content': '#e2e8f0',       // slate-200 — texte clair
          'info': '#38bdf8',
          'success': '#34d399',
          'warning': '#fbbf24',
          'error': '#fb7185',
          '--rounded-box': '1rem',
          '--rounded-btn': '0.65rem',
          '--rounded-badge': '0.5rem',
          '--animation-btn': '0.2s',
          '--animation-input': '0.2s',
          '--border-btn': '1px',
          '--tab-radius': '0.5rem',
        },
      },
    ],
  },
};