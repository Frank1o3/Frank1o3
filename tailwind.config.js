// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './*.{js,ts}',
        './**/*.{js,ts}'
    ],
    // Tailwind v4: theme is in @theme block in input.css, so no theme config needed here
    plugins: []
};