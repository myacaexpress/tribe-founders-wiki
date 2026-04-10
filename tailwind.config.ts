import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#faf7f2",
        white: "#ffffff",
        border: "#eae4da",
        "text-primary": "#1a1a1a",
        "text-muted": "#8a8580",
        teal: "#2b8a88",
        coral: "#e85d4e",
        sage: "#a8b5a0",
        amber: "#e8a33d",
      },
      fontFamily: {
        serif: ['Georgia', '"Times New Roman"', 'serif'],
        sans: ['-apple-system', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
  ],
};

export default config;
