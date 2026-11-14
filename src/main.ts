import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { seedDemoOnce } from './core/demo'
import { settings } from './core/settings.svelte'
import { applyTheme } from './core/theme'
import { darkTheme, lightTheme } from './themes/default'

applyTheme(matchMedia('(prefers-color-scheme: light)').matches ? lightTheme : darkTheme)

// při úplně prvním použití se nejdřív nainstalují ukázková data (chyba úložiště aplikaci nezastaví)
await seedDemoOnce(settings.author).catch(() => false)

const app = mount(App, { target: document.getElementById('app')! })
export default app
