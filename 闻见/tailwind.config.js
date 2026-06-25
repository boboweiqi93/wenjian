module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './index.html'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-bg-primary)',
        secondary: 'var(--color-bg-secondary)',
        tertiary: 'var(--color-bg-tertiary)',
        accent: 'var(--color-accent)',
        'accent-light': 'var(--color-accent-light)',
        border: 'var(--color-border)',
        wood: 'var(--color-wood)',
        mist: {
          DEFAULT: 'var(--color-accent)',
          light: 'var(--color-accent-light)',
          muted: 'var(--text-muted)',
        },
      },
      textColor: {
        primary: 'var(--color-text-primary)',
        secondary: 'var(--color-text-secondary)',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Source Han Serif SC', 'STSong', 'SimSun', 'serif'],
        sans: ['"Noto Sans SC"', 'Source Han Sans SC', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
    }
  },
  plugins: [
    require('@tailwindcss/line-clamp')
  ]
};
