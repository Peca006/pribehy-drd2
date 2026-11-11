import type { Theme } from '../core/theme'

export const darkTheme: Theme = {
  id: 'default-dark',
  name: 'Tmavý',
  scheme: 'dark',
  tokens: {
    '--drd-bg': '#1c1a17',
    '--drd-surface': '#2a2622',
    '--drd-text': '#efe7d8',
    '--drd-muted': '#a89f8f',
    '--drd-accent': '#d9a441',
    '--drd-radius': '10px',
    '--drd-gap': '1rem',
    '--drd-font': "system-ui, 'Segoe UI', Roboto, sans-serif",
  },
}

export const lightTheme: Theme = {
  id: 'default-light',
  name: 'Světlý',
  scheme: 'light',
  tokens: {
    ...darkTheme.tokens,
    '--drd-bg': '#f6f1e6',
    '--drd-surface': '#ffffff',
    '--drd-text': '#2a2622',
    '--drd-muted': '#6b6254',
    '--drd-accent': '#9a6b12',
  },
}

export const themes = [darkTheme, lightTheme]
