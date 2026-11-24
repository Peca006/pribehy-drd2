import type { Theme } from '../core/theme'

// Role tokenů (vzhled aplikace se nemění, jen jsou role odděleny, aby je skin mohl ladit samostatně):
//  bg, surface            plochy
//  text, text-muted       text a tlumený text
//  border                 okraje a dělicí čáry
//  accent                 zvýraznění (nadpisy, odkazy, primární tlačítka)
//  danger, success, warning   stavové barvy textu (musí být čitelné na bg i surface)
//  scrim, shadow          zástěna za dialogy a stín plovoucích prvků
//  radius, gap, font      tvar, mezery, písmo
export const darkTheme: Theme = {
  id: 'default-dark',
  name: 'Tmavý',
  scheme: 'dark',
  tokens: {
    '--drd-bg': '#1c1a17',
    '--drd-surface': '#2a2622',
    '--drd-text': '#efe7d8',
    '--drd-text-muted': '#a89f8f',
    '--drd-border': '#a89f8f',
    '--drd-accent': '#d9a441',
    '--drd-danger': '#ee8888',
    '--drd-success': '#77cc77',
    '--drd-warning': '#e8c070',
    '--drd-scrim': 'rgb(0 0 0 / 0.6)',
    '--drd-shadow': '0 2px 12px rgb(0 0 0 / 0.5)',
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
    '--drd-text-muted': '#6b6254',
    '--drd-border': '#6b6254',
    '--drd-accent': '#9a6b12',
    // tmavší odstíny: světlé varianty z tmavého skinu by na světlém pozadí neměly dost kontrastu
    '--drd-danger': '#b3261e',
    '--drd-success': '#2e7d32',
    '--drd-warning': '#8a5a00',
    '--drd-shadow': '0 2px 12px rgb(0 0 0 / 0.25)',
  },
}

export const themes = [darkTheme, lightTheme]
