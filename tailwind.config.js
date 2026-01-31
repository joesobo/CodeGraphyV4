/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/webview/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: 'var(--vscode-textLink-foreground, #60a5fa)',
      },
    },
  },
  plugins: [],
};
