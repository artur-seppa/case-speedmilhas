// Tailwind v4 entra como plugin do PostCSS — não existe mais `tailwind.config.js`
// nem `npx tailwindcss init`. A configuração, se você precisar de alguma, vive
// dentro do próprio CSS (`app/globals.css`).
const config = {
  plugins: ['@tailwindcss/postcss'],
};

export default config;
