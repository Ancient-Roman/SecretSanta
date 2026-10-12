import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'santa-red': '#C41E3A',
        'santa-green': '#165B33',
      },
    },
  },
  plugins: [],
}
export default config
